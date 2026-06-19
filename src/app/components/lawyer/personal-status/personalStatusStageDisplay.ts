import type { CaseStage } from '@/app/components/lawyer/LawyerShared';
import {
    buildChromeStageStripItems,
    type ChromeStageStripItem,
} from '@/app/components/lawyer/smart-modal/smartFile/stepperPipeline';
import { isCassationStageName } from '@/app/components/lawyer/smart-modal/smartFile/judgmentTypes';
import { PERSONAL_STATUS_STAGE_OPTIONS } from './personalStatusValidation';

const CIVIL_STAGE_PATTERN = /بداءة|استئناف|بدرجة\s*أولى/i;

/** هل اسم المرحلة ضمن مسار الأحوال الشخصية (وليس المدني)؟ */
export function isPersonalStatusStageName(stageName?: string | null): boolean {
    const s = String(stageName ?? '').trim();
    if (!s || containsCivilStageTerminology(s)) return false;
    return PERSONAL_STATUS_STAGE_OPTIONS.some(
        (opt) => s === opt || s === `ال${opt}` || s.includes(opt),
    );
}

/** إزالة «استئناف» من خيارات الطعn في الأحوال الشخصية. */
export function filterPersonalStatusAppealMethods(methods: readonly string[]): string[] {
    return methods.filter((m) => m !== 'استئناف' && !/استئناف/i.test(m));
}

/** مصطلحات المدني (بداءة / استئناف) — لا تُعرض في واجهة الأحوال الشخصية. */
export function containsCivilStageTerminology(stageName: string): boolean {
    return CIVIL_STAGE_PATTERN.test(stageName.trim());
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

/** إظهار مرحلة الأحوال في الشريط عند وجود تمييز/طعn استثنائي. */
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

/** المرحلة الأساسية للدعوى (قبل تمييز / إجراءات استثنائية). */
export function isPersonalStatusCoreStage(stageName?: string | null): boolean {
    const s = String(stageName ?? '').trim();
    if (!s || s.includes('أحوال شخصية') || containsCivilStageTerminology(s)) return true;
    if (s.includes('تمييز') || s.includes('اعتراض') || s.includes('إعادة المحاكمة')) return false;
    return true;
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
