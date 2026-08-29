/**
 * مساعدات مراحل/طعون الأحوال الشخصية — بلا اعتماد على smart-modal.
 * يكسر دورة: personalStatusStageDisplay ↔ judgmentTypes ↔ stepperPipeline.
 */
import type { LawsuitJurisdictionSource } from '@/app/domain/lawsuit/lawsuitJurisdiction';
import { PERSONAL_STATUS_STAGE_OPTIONS, isPersonalStatusFile } from './personalStatusValidation';

const CIVIL_STAGE_PATTERN = /بداءة|استئناف|بدرجة\s*أولى/i;

const SHARED_EXTRAORDINARY_STAGE_MARKERS = [
    'اعتراض على الحكم الغيابي',
    'اعتراض الغير',
    'إعادة المحاكمة',
] as const;

type AppealContextFile = LawsuitJurisdictionSource & { type?: string };

function isCivilLawsuitFile(file: AppealContextFile): boolean {
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

/** مصطلحات المدني (بداءة / استئناف) — لا تُعرض في واجهة الأحوال الشخصية. */
export function containsCivilStageTerminology(stageName: string): boolean {
    return CIVIL_STAGE_PATTERN.test(stageName.trim());
}

/** هل سجل المراحل يحتوي مسار مدني (بداءة / استئناف)؟ */
export function hasCivilLawsuitStageHistory(
    stages?: Array<{ stageName?: string | null; name?: string | null }> | null,
): boolean {
    return (stages ?? []).some((s) =>
        containsCivilStageTerminology(String(s.stageName ?? s.name ?? '')),
    );
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

/**
 * سياق طعن أحوال شخصية — لا يُستدل عليه من اسم مرحلة مشتركة (اعتراض غيابي)
 * إذا وُجدت مراحل مدنية سابقة أو الإضبارة مدنية.
 */
export function isPersonalStatusAppealContext(
    stageName?: string | null,
    stages?: Array<{ stageName?: string | null; name?: string | null }> | null,
    file?: AppealContextFile | Record<string, unknown> | null,
): boolean {
    const ctx = file && typeof file === 'object' ? (file as AppealContextFile) : null;
    if (ctx && isPersonalStatusFile(ctx)) return true;
    if (ctx && isCivilLawsuitFile(ctx)) return false;
    if (hasCivilLawsuitStageHistory(stages)) return false;
    if (isPersonalStatusStageName(stageName)) return true;
    const current = String(stageName ?? '').trim();
    const sharedExtraordinary = SHARED_EXTRAORDINARY_STAGE_MARKERS.some((marker) =>
        current.includes(marker),
    );
    if (sharedExtraordinary) {
        return (stages ?? []).some((s) => isPersonalStatusStageName(s.stageName ?? s.name));
    }
    return false;
}

/** إزالة «استئناف» وجميع صيغه من خيارات الطعن في الأحوال الشخصية. */
export function isPersonalStatusNoAppealMethod(method?: string | null): boolean {
    return /استئناف/i.test(String(method ?? '').trim());
}

export function filterPersonalStatusAppealMethods(methods: readonly string[]): string[] {
    return methods.filter((m) => !isPersonalStatusNoAppealMethod(m));
}

/** المرحلة الأساسية للدعوى (قبل تمييز / إجراءات استثنائية). */
export function isPersonalStatusCoreStage(stageName?: string | null): boolean {
    const s = String(stageName ?? '').trim();
    if (!s || s.includes('أحوال شخصية') || containsCivilStageTerminology(s)) return true;
    if (s.includes('تمييز') || s.includes('اعتراض') || s.includes('إعادة المحاكمة')) return false;
    return true;
}
