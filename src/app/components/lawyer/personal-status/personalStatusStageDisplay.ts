import type { CaseStage } from '@/app/components/lawyer/LawyerShared';
import {
    buildChromeStageStripItems,
    type ChromeStageStripItem,
} from '@/app/components/lawyer/smart-modal/smartFile/stepperPipeline';
import { isCassationStageName } from '@/app/components/lawyer/smart-modal/smartFile/judgmentStageNames';
import {
    containsCivilStageTerminology,
    filterPersonalStatusAppealMethods,
    hasCivilLawsuitStageHistory,
    isPersonalStatusAppealContext,
    isPersonalStatusCoreStage,
    isPersonalStatusNoAppealMethod,
    isPersonalStatusStageName,
} from './personalStatusAppealStageHelpers';

export {
    containsCivilStageTerminology,
    filterPersonalStatusAppealMethods,
    hasCivilLawsuitStageHistory,
    isPersonalStatusAppealContext,
    isPersonalStatusCoreStage,
    isPersonalStatusNoAppealMethod,
    isPersonalStatusStageName,
} from './personalStatusAppealStageHelpers';

/** في الأحوال الشخصية: أي طعن استئنافي يُحوَّل تمييزاً (لا استئناف قانونياً). */
export function normalizePersonalStatusAppealMethod(
    method: string,
    ctx?: {
        stageName?: string | null;
        stages?: Array<{ stageName?: string | null; name?: string | null }> | null;
        file?: { lawsuitJurisdiction?: string; selectedType?: string } | null;
    },
): string {
    const raw = String(method ?? '').trim();
    if (!raw) return raw;
    if (!isPersonalStatusAppealContext(ctx?.stageName, ctx?.stages, ctx?.file)) return raw;
    if (isPersonalStatusNoAppealMethod(raw)) return 'تمييز';
    return raw;
}

/** إضبارة أحوال شخصية من سجل المراحل (بدون تاريخ مدني). */
export function isPersonalStatusDossierFromStages(
    stages?: Array<{ stageName?: string | null; name?: string | null }> | null,
): boolean {
    if (hasCivilLawsuitStageHistory(stages)) return false;
    return (stages ?? []).some((s) =>
        isPersonalStatusStageName(String(s.stageName ?? s.name ?? '')),
    );
}

/** تسمية مرحلة للعرض — تُرجع null لإخفاء الشارة أو pill غير المناسب. */
export function formatPersonalStatusStageDisplayName(
    raw: string,
    options?: { showCoreStage?: boolean },
): string | null {
    const s = raw.trim();
    if (!s) return null;
    if (containsCivilStageTerminology(s)) return null;
    if (s === 'أحوال شخصية' || s === 'الأحوال الشخصية') {
        return options?.showCoreStage ? 'أحوال شخصية' : null;
    }
    if (s === 'التمييز') return 'تمييز';
    return s;
}

/** إظهار مرحلة الأحوال في الشريط عند وجود تمييز/طعن استثنائي. */
export function shouldShowPersonalStatusCoreStageInChrome(stages: CaseStage[]): boolean {
    if (stages.length > 1) return true;
    return stages.some((stage) => {
        const name = String(stage.stageName ?? stage.name ?? '').trim();
        return (
            isCassationStageName(name)
            || name.includes('اعتراض')
            || name.includes('إعادة المحاكمة')
        );
    });
}

export function buildPersonalStatusChromeStageStripItems(
    stages: CaseStage[],
    activeStageIndex: number,
    viewingStageIndex: number,
): ChromeStageStripItem[] {
    const showCoreStage = shouldShowPersonalStatusCoreStageInChrome(stages);
    const labelOptions = { showCoreStage };

    return buildChromeStageStripItems(stages, activeStageIndex, viewingStageIndex)
        .filter((item) => {
            if (item.isPlaceholder) {
                return item.displayName === 'التمييز' || item.displayName === 'تمييز';
            }
            return formatPersonalStatusStageDisplayName(item.displayName, labelOptions) !== null;
        })
        .map((item) => {
            if (item.isPlaceholder) {
                return { ...item, displayName: 'تمييز' };
            }
            const label = formatPersonalStatusStageDisplayName(item.displayName, labelOptions);
            return { ...item, displayName: label ?? item.displayName };
        });
}

/** بعد تقديم التمييز — قبل تسجيل تصديق/نقض قرار محكمة التمييز. */
export function shouldShowPersonalStatusCassationOutcomePanel(input: {
    stage?: Pick<CaseStage, 'stageName' | 'status' | 'finalDecision'> | null;
    isViewingArchived?: boolean;
    viewingStageIndex: number;
    activeStageIndex: number;
}): boolean {
    if (input.isViewingArchived) return false;
    if (input.viewingStageIndex !== input.activeStageIndex) return false;
    const stage = input.stage;
    if (!stage || !isCassationStageName(stage.stageName)) return false;
    if (stage.status === 'completed') return false;
    const fd = String(stage.finalDecision ?? '');
    if (fd.includes('مصدق') || fd.includes('منقوض')) return false;
    return true;
}
