import type { CaseStage } from '@/app/components/lawyer/LawyerShared';
import {
    buildChromeStageStripItems,
    type ChromeStageStripItem,
} from '@/app/components/lawyer/smart-modal/smartFile/stepperPipeline';
import { isCassationStageName } from '@/app/components/lawyer/smart-modal/smartFile/judgmentTypes';
import { PERSONAL_STATUS_STAGE_OPTIONS, isPersonalStatusFile } from './personalStatusValidation';

const CIVIL_STAGE_PATTERN = /بداءة|استئناف|بدرجة\s*أولى/i;

/** هل سجل المراحل يحتوي مسار مدني (بداءة / استئناف)؟ */
export function hasCivilLawsuitStageHistory(
    stages?: Array<{ stageName?: string | null; name?: string | null }> | null,
): boolean {
    return (stages ?? []).some((s) =>
        containsCivilStageTerminology(String(s.stageName ?? s.name ?? '')),
    );
}

const SHARED_EXTRAORDINARY_STAGE_MARKERS = [
    'اعتراض على الحكم الغيابي',
    'اعتراض الغير',
    'إعادة المحاكمة',
] as const;

function isCivilLawsuitFile(file: {
    lawsuitJurisdiction?: string;
    selectedType?: string;
    type?: string;
}): boolean {
    if (isPersonalStatusFile(file)) return false;
    const type = String(file.type ?? '').toLowerCase();
    const selected = String(file.selectedType ?? '').toLowerCase();
    const jurisdiction = String(file.lawsuitJurisdiction ?? '').toLowerCase();
    return (
        type === 'lawsuit'
        || selected === 'civil'
        || jurisdiction === 'lawsuit'
        || jurisdiction === 'civil'
    );
}

/**
 * سياق طعن أحوال شخصية — لا يُستدل عليه من اسم مرحلة مشتركة (اعتراض غيابي)
 * إذا وُجدت مراحل مدنية سابقة أو الإضبارة مدنية.
 */
export function isPersonalStatusAppealContext(
    stageName?: string | null,
    stages?: Array<{ stageName?: string | null; name?: string | null }> | null,
    file?: { lawsuitJurisdiction?: string; selectedType?: string; type?: string } | null,
): boolean {
    if (file && isPersonalStatusFile(file)) return true;
    if (file && isCivilLawsuitFile(file)) return false;
    if (hasCivilLawsuitStageHistory(stages)) return false;
    return isPersonalStatusStageName(stageName);
}

/** هل اسم المرحلة ضمن مسار الأحوال الشخصية (وليس المدني)؟ */
export function isPersonalStatusStageName(stageName?: string | null): boolean {
    const s = String(stageName ?? '').trim();
    if (!s || containsCivilStageTerminology(s)) return false;
    if (SHARED_EXTRAORDINARY_STAGE_MARKERS.some((marker) => s.includes(marker))) {
        return false;
    }
    if (s.includes('تمييز') || s === 'التمييز') return true;
    return PERSONAL_STATUS_STAGE_OPTIONS.some(
        (opt) => s === opt || s === `ال${opt}` || s.includes(opt),
    );
}

/** إزالة «استئناف» وجميع صيغه من خيارات الطعن في الأحوال الشخصية. */
export function isPersonalStatusNoAppealMethod(method?: string | null): boolean {
    return /استئناف/i.test(String(method ?? '').trim());
}

export function filterPersonalStatusAppealMethods(methods: readonly string[]): string[] {
    return methods.filter((m) => !isPersonalStatusNoAppealMethod(m));
}

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
