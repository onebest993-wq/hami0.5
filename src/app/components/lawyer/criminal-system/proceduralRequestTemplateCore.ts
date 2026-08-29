import type { JudicialDecision } from '@/app/types/criminal';
import { PRIVATE_RIGHT_WAIVER_REQUEST_TYPE } from './criminalStageUtils';

/** طلب محامٍ مخصص — مسار pending / approved / rejected. */
export const CUSTOM_LAWYER_MOTION_TYPE = 'طلب محامٍ مخصص (إدخال يدوي)';
/** قرار قضائي مخصص — يُسجَّل نافذاً مع خيار قابلية التمييز. */
export const CUSTOM_JUDICIAL_DECISION_TYPE = 'قرار قضائي مخصص (إدخال يدوي)';

export const COMPLAINT_COURT_REFERRAL_TEMPLATE = 'إحالة الشكوى إلى محكمة أخرى';

/** @deprecated — القالب الموحّد السابق؛ يُحفظ للتوافق مع البيانات القديمة */
export const ARREST_SUMMON_TEMPLATE = 'إصدار أمر (استقدام / قبض وتحري)';
export const SUMMON_ORDER_TEMPLATE = 'إصدار أمر استقدام';
export const ARREST_ORDER_TEMPLATE = 'إصدار أمر قبض';
/** قرار توقيف موحّد — يُدار بمحرك الموقوفية (بدء/انتهاء + executed). */
export const DETENTION_DECISION_TEMPLATE = 'قرار توقيف المتهم';

export const BAIL_RELEASE_TEMPLATE = 'طلب إخلاء سبيل بكفالة / بتعهد';
/** قرار قضائي بتكفيل المتهم — كفالة مالية أو شخص ضامن. يُسجَّل نافذاً ويغيّر حالة المتهم إلى «مكفل». */
export const DEFENDANT_BAIL_TEMPLATE = 'تكفيل المتهم';
/**
 * قرار قضائي بحجز أموال المتهم الهارب (م 121 أصول جزائية).
 * يَظهر فقط حين يوجد متهم واحد على الأقل بحالة «هارب».
 * يَكتب على كل متهم محدّد قائمة أصناف المال المحجوز.
 */
export const ASSET_SEIZURE_TEMPLATE = 'حجز الأموال';

/** قرارات قاضي الأحداث — خمسة خيارات في المجموعة الثانية من القائمة المنسدلة. */
export const JUVENILE_OBSERVATION_HOME_DECISION_TEMPLATE = 'قرار إيداع دار الملاحظة';
export const JUVENILE_PROVISIONAL_DELIVERY_DECISION_TEMPLATE = 'تسليم الحدث لوليه بتعهد';
export const JUVENILE_SOCIAL_INQUIRY_REFERRAL_TEMPLATE = 'إحالة إلى مكتب البحث الاجتماعي';

/** قرارات حصرية لقاضي الأحداث — لا تُعرض في مجموعة قرارات البالغين. */
export const JUVENILE_EXCLUSIVE_JUDGE_DECISION_TEMPLATES = [
    JUVENILE_OBSERVATION_HOME_DECISION_TEMPLATE,
    JUVENILE_PROVISIONAL_DELIVERY_DECISION_TEMPLATE,
    JUVENILE_SOCIAL_INQUIRY_REFERRAL_TEMPLATE,
] as const;

export const JUVENILE_JUDGE_DECISION_TEMPLATES = [
    SUMMON_ORDER_TEMPLATE,
    ARREST_ORDER_TEMPLATE,
    ...JUVENILE_EXCLUSIVE_JUDGE_DECISION_TEMPLATES,
] as const;

/** قرارات قاضي الأحداث التي تظهر عليها علامة/زر الطعن التمييزي تلقائياً. */
export const JUVENILE_JUDGE_CASSATION_APPEALABLE_TEMPLATES = new Set<string>([
    JUVENILE_OBSERVATION_HOME_DECISION_TEMPLATE,
    JUVENILE_PROVISIONAL_DELIVERY_DECISION_TEMPLATE,
]);

export function isJuvenileJudgeCassationAppealableTemplate(template: string | undefined): boolean {
    const key = normalizeProceduralRequestTemplate(String(template ?? '').trim());
    return JUVENILE_JUDGE_CASSATION_APPEALABLE_TEMPLATES.has(key);
}

const JUVENILE_EXCLUSIVE_JUDGE_DECISION_TEMPLATE_SET = new Set<string>(
    JUVENILE_EXCLUSIVE_JUDGE_DECISION_TEMPLATES,
);

/** استقدام/قبض — يظهران للبالغين وللأحداث حسب مجموعة القائمة وتركيب الإضبارة. */
export function isInvestigationSharedOrderTemplate(template: string | undefined): boolean {
    const key = normalizeProceduralRequestTemplate(String(template ?? '').trim());
    return key === SUMMON_ORDER_TEMPLATE || key === ARREST_ORDER_TEMPLATE;
}

export function isJuvenileJudgeDecisionTemplate(template: string | undefined): boolean {
    const key = normalizeProceduralRequestTemplate(String(template ?? '').trim());
    return JUVENILE_EXCLUSIVE_JUDGE_DECISION_TEMPLATE_SET.has(key);
}

/** صلح/غلق/انقضاء — لقاضي الأحداث فقط عند juveniles_only (لا تُكرَّر مع بالغ). */
export function isJuvenileExclusiveInvestigationPurgeTemplate(template: string | undefined): boolean {
    const key = normalizeProceduralRequestTemplate(String(template ?? '').trim());
    return (INVESTIGATION_PURGE_JUDICIAL_TEMPLATES as readonly string[]).includes(key);
}

/** قرارات غلق/صلح/تفريق في مرحلة التحقيق — تُسجَّل من اليوميات وتُفعّل تصفية الخصوم. */
export const INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE = 'غلق الدعوى مؤقتاً (مادة 130)';
/** غلق نهائي للدعوى كاملة — يشمل المعلومين والمجهولين. */
export const INVESTIGATION_CLOSURE_FINAL_OBJECTIVE_TEMPLATE = 'غلق نهائي موضوعي (مادة 130)';
/** غلق نهائي بحق متهم معلوم محدّد — لا ينطبق على المجهول. */
export const INVESTIGATION_CLOSURE_FINAL_PERSONAL_TEMPLATE = 'غلق نهائي شخصي (مادة 130)';
/** @deprecated — يُطبَّع إلى غلق نهائي شخصي */
export const INVESTIGATION_CLOSURE_FINAL_TEMPLATE = 'غلق الدعوى نهائياً (مادة 130)';
export const INVESTIGATION_SEVERANCE_JUDICIAL_TEMPLATE = 'تفريق وشطر الإضبارة (قرار قضائي)';
export const INVESTIGATION_MERGE_JUDICIAL_TEMPLATE = 'ضم وتوحيد الإضبارة (قرار قضائي)';

/** انقضاء/سقوط — يُسجَّل عبر `issueStageDecision` عند توثيق القرار القضائي. */
export const INVESTIGATION_EXPIRATION_JUDICIAL_TEMPLATE =
    'انقضاء / سقوط الدعوى الجزائية (مادة 130)';

export const INVESTIGATION_PURGE_JUDICIAL_TEMPLATES = [
    INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
    INVESTIGATION_CLOSURE_FINAL_OBJECTIVE_TEMPLATE,
    INVESTIGATION_CLOSURE_FINAL_PERSONAL_TEMPLATE,
    PRIVATE_RIGHT_WAIVER_REQUEST_TYPE,
    INVESTIGATION_EXPIRATION_JUDICIAL_TEMPLATE,
] as const;

export function isInvestigationExpirationJudicialTemplate(template: string | undefined): boolean {
    const key = normalizeProceduralRequestTemplate(String(template ?? '').trim());
    return key === INVESTIGATION_EXPIRATION_JUDICIAL_TEMPLATE;
}

/** القرارات المسموحة طالما يوجد متهم مجهول — حتى كشف الهوية (لا غلق شخصي). */
export const UNKNOWN_PERPETRATOR_ALLOWED_JUDICIAL_TEMPLATES = [
    INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
    INVESTIGATION_CLOSURE_FINAL_OBJECTIVE_TEMPLATE,
    CUSTOM_JUDICIAL_DECISION_TYPE,
] as const;

export function isInvestigationPurgeDecisionTemplate(template: string | undefined): boolean {
    const key = normalizeProceduralRequestTemplate(String(template ?? '').trim());
    if (isInvestigationExpirationJudicialTemplate(key)) return false;
    return (INVESTIGATION_PURGE_JUDICIAL_TEMPLATES as readonly string[]).includes(key);
}

/** صلح/تنازل — تنفيذ فوري بلا طعن تمييزي ولا «قناعة». */
export function isInvestigationImmediatePurgeTemplate(template: string | undefined): boolean {
    const key = normalizeProceduralRequestTemplate(String(template ?? '').trim());
    return key === PRIVATE_RIGHT_WAIVER_REQUEST_TYPE;
}

/** صلح/تنازل — alias صريح لواجهة التأكيد والفلاتر. */
export const isPrivateRightWaiverTemplate = isInvestigationImmediatePurgeTemplate;

/** غلق/تفريق — يُزال المتهم فوراً ويبقى الطعن التمييزي متاحاً. */
export function isInvestigationClosureAppealablePurgeTemplate(template: string | undefined): boolean {
    const key = normalizeProceduralRequestTemplate(String(template ?? '').trim());
    return (
        key === INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE ||
        isInvestigationFinalClosureTemplate(template) ||
        key === INVESTIGATION_SEVERANCE_JUDICIAL_TEMPLATE
    );
}

export function isInvestigationObjectiveFinalClosureTemplate(template: string | undefined): boolean {
    return (
        normalizeProceduralRequestTemplate(String(template ?? '').trim()) ===
        INVESTIGATION_CLOSURE_FINAL_OBJECTIVE_TEMPLATE
    );
}

export function isInvestigationPersonalFinalClosureTemplate(template: string | undefined): boolean {
    return (
        normalizeProceduralRequestTemplate(String(template ?? '').trim()) ===
        INVESTIGATION_CLOSURE_FINAL_PERSONAL_TEMPLATE
    );
}

export function isInvestigationFinalClosureTemplate(template: string | undefined): boolean {
    return (
        isInvestigationObjectiveFinalClosureTemplate(template) ||
        isInvestigationPersonalFinalClosureTemplate(template)
    );
}

/** غلق مؤقت/موضوعي وتفريق يشملان المتهم المجهول — الغلق الشخصي للمعلومين فقط. */
export function purgeDecisionIncludesUnknownDefendants(template: string | undefined): boolean {
    const key = normalizeProceduralRequestTemplate(String(template ?? '').trim());
    return (
        key === INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE ||
        key === INVESTIGATION_CLOSURE_FINAL_OBJECTIVE_TEMPLATE ||
        key === INVESTIGATION_SEVERANCE_JUDICIAL_TEMPLATE
    );
}

export function isInvestigationSeveranceJudicialTemplate(template: string | undefined): boolean {
    const key = normalizeProceduralRequestTemplate(String(template ?? '').trim());
    return key === INVESTIGATION_SEVERANCE_JUDICIAL_TEMPLATE;
}

export function isInvestigationMergeJudicialTemplate(template: string | undefined): boolean {
    const key = normalizeProceduralRequestTemplate(String(template ?? '').trim());
    return key === INVESTIGATION_MERGE_JUDICIAL_TEMPLATE;
}

/** غلق/تفريق/توحيد — مسار تأييد/نقض تمييزي (لا quash_remand الموضوعي). */
export function isInvestigationStructuralCassationTemplate(template: string | undefined): boolean {
    return (
        isInvestigationClosureAppealablePurgeTemplate(template) ||
        isInvestigationMergeJudicialTemplate(template)
    );
}

/** تسمية العرض في القوائم والبطاقات — دون «130» أو «قرار قضائي» التعليمية. */
export function formatJudicialTemplateDisplayLabel(title: string | undefined): string {
    const key = normalizeProceduralRequestTemplate(String(title ?? '').trim());
    if (key === PRIVATE_RIGHT_WAIVER_REQUEST_TYPE) return 'صلح/ تنازل';
    if (key === DETENTION_DECISION_TEMPLATE) return 'توقيف المتهم';
    return String(title ?? '')
        .replace(/\s*\(\s*مادة\s*130\s*\)/gi, '')
        .replace(/\s*\(\s*قرار\s*قضائي\s*\)/gi, '')
        .replace(/^قرار\s*قضائي\s*:\s*/i, '')
        .replace(/\s*—\s*مادة\s*130\s*/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/** @deprecated — استخدم formatJudicialTemplateDisplayLabel */
export function formatInvestigationPurgeDecisionDisplayTitle(title: string | undefined): string {
    return formatJudicialTemplateDisplayLabel(title);
}

/** عناوين مجموعات القائمة المنسدلة في مودال الطلب/القرار. */
export const JUDICIAL_DECISION_OPTGROUP_LABEL = '🏛️ قرارات وأوامر قضائية';
export const LAWYER_MOTION_OPTGROUP_LABEL = '⚖️ طلبات المحامي';

const LEGACY_TEMPLATE_ALIASES: Record<string, string> = {
    'إجراء مخصص (إدخال يدوي)': CUSTOM_LAWYER_MOTION_TYPE,
    'إجراء قضائي مخصص (إدخال يدوي)': CUSTOM_LAWYER_MOTION_TYPE,
    'طلب محامٍ مخصص (إدخال يدوي)': CUSTOM_LAWYER_MOTION_TYPE,
    'قرار قضائي مخصص (إدخال يدوي)': CUSTOM_JUDICIAL_DECISION_TYPE,
    'إحالة الشكوى إلى محكمة أخرى': COMPLAINT_COURT_REFERRAL_TEMPLATE,
    'إصدار أمر استقدام / قبض': ARREST_SUMMON_TEMPLATE,
    'إصدار أمر (استقدام / قبض)': ARREST_SUMMON_TEMPLATE,
    'إصدار أمر استقدام': SUMMON_ORDER_TEMPLATE,
    'إصدار أمر قبض': ARREST_ORDER_TEMPLATE,
    'قرار إخلاء سبيل بكفالة / بتعهد': BAIL_RELEASE_TEMPLATE,
    'قرار إخلاء سبيل بكفالة / تعهد': BAIL_RELEASE_TEMPLATE,
    'تدوين ملحق لأقوال (مشتكي / مشكو منه / شاهد)': 'إجراء قضائي مخصص (إدخال يدوي)',
    'تدوين إفادة (مشتكي / شاهد)': 'إجراء قضائي مخصص (إدخال يدوي)',
    'تدوين إفادة (مشتكي / مخبر / شاهد)': 'إجراء قضائي مخصص (إدخال يدوي)',
    'تدوين أقوال المتهم': 'إجراء قضائي مخصص (إدخال يدوي)',
    'تدوين أقوال (مشتكي / شاهد / متهم)': 'إجراء قضائي مخصص (إدخال يدوي)',
    'قرار توقيف / تمديد توقيف': DETENTION_DECISION_TEMPLATE,
    'قرار توقيف ابتداءً': DETENTION_DECISION_TEMPLATE,
    'قرار تمديد توقيف': DETENTION_DECISION_TEMPLATE,
    [INVESTIGATION_CLOSURE_FINAL_TEMPLATE]: INVESTIGATION_CLOSURE_FINAL_PERSONAL_TEMPLATE,
};

export function normalizeProceduralRequestTemplate(template: string | undefined): string {
    const key = String(template ?? '').trim();
    return LEGACY_TEMPLATE_ALIASES[key] ?? key;
}

/** قرارات قضائية نافذة — تُسجَّل مباشرة دون مسار قيد النظر/موافقة/رفض. */
export const ORDER_ENFORCEMENT_TEMPLATES = [
    SUMMON_ORDER_TEMPLATE,
    ARREST_ORDER_TEMPLATE,
    ARREST_SUMMON_TEMPLATE,
] as const;
