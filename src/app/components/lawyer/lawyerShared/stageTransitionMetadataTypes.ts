/**
 * أنواع صريحة لخط أنابيب بيانات الطعn — مصدر الحقيقة على مستوى lawyerShared.
 * بديل تدريجي لمطابقة النصوص (heuristics) في محرك الطعn.
 */

/** نتيجة الموكل في مرحلة قضائية مغلقة */
export type StageOutcome = 'WIN' | 'LOSS' | 'PARTIAL' | 'FINALIZED';

/** شكل الحكم — حضوري / غيابي / مختلط (صفة الأطراف على البطاقات، لا على هذا الحقل وحده) */
export type JudgmentFormType = 'HADORI' | 'GHAYABI' | 'MIXED';

/** اختصاص الإضبارة */
export type CourtJurisdiction = 'CIVIL' | 'PERSONAL_STATUS' | 'LABOR' | 'COMMERCIAL';

/**
 * درجة الطعn من البداءة:
 * - FIRST_DEGREE: استئnaaf (مدني) أو مسار درجة أولى
 * - FINAL_DEGREE: تمyيز مباشر دون مرحلة استئnaaf
 */
export type FirstInstanceDegree = 'FIRST_DEGREE' | 'FINAL_DEGREE';

/** بيانات انتقال مرحلي مهيكلة — تُكتب عند كل hop طعn */
export interface StageTransitionMetadata {
    /** معرفات من قام بالطعn صراحةً (string-normalized) */
    appellantPartyIds: string[];
    /** معرفات المطعون ضدهم */
    appelleePartyIds: string[];
    /** نتيجة الموكل في المرحلة التي أُغلقت قبل هذا الانتقال */
    priorStageOutcome: StageOutcome;
    /** شكل الحكم في المرحلة السابقة */
    priorJudgmentForm: JudgmentFormType;
    /** منطوق الحكم في المرحلة السابقة (نص عربي للعرض/الأرشفة) */
    priorJudgmentType?: string;
    /** هل هذا انتقال طعn متقاطع */
    isCrossAppeal?: boolean;
}

/**
 * appealMetadata على CaseStage — يدمج الحقول المهيكلة مع legacy durante الهجرة.
 */
export interface AppealStageMetadata extends Partial<StageTransitionMetadata> {
    /** @deprecated استخدم appellantPartyIds */
    initialAppellantPartyIds?: Array<number | string>;
    appealType?: string;
    appellant?: string;
    filingDate?: string;
    previousCaseNumber?: string;
    previousStage?: string;
    /** @deprecated استخدم isCrossAppeal */
    hasCrossAppeal?: boolean;
    crossAppealDate?: string;
    crossAppealReceipt?: string;
    crossAppealPartyIds?: Array<number | string>;
    /**
     * تصنيف الاستئناف المتقابل وفق م/190 مرافعات:
     * ORIGINAL = ضمن مدة الطعن الأصلية (15 يوماً من التبليغ)
     * DEPENDENT = بعد المدة وحتى ختام المرافعة (تبعي)
     */
    crossAppealClassification?: 'ORIGINAL' | 'DEPENDENT';
    jurisdiction?: CourtJurisdiction;
    firstInstanceDegree?: FirstInstanceDegree;
    /** نتيجة الموكل بعد إغلاق هذه المرحلة */
    clientStageOutcome?: StageOutcome;
    /** شكل الحكم المسجَّل في هذه المرحلة */
    stageJudgmentForm?: JudgmentFormType;
    /**
     * نطاق أسباب النقض عند إعادة الإضبارة (م/210):
     * COMMON = أسباب تمس أصل النزاع فتمتد للشركاء في النزاع غير القابل للتجزئة
     * PERSONAL = أسباب قاصرة على الطاعن
     */
    cassationGroundsScope?: 'COMMON' | 'PERSONAL';
}

export const STAGE_OUTCOMES: readonly StageOutcome[] = [
    'WIN',
    'LOSS',
    'PARTIAL',
    'FINALIZED',
] as const;

export const JUDGMENT_FORM_TYPES: readonly JudgmentFormType[] = [
    'HADORI',
    'GHAYABI',
    'MIXED',
] as const;

export const COURT_JURISDICTIONS: readonly CourtJurisdiction[] = [
    'CIVIL',
    'PERSONAL_STATUS',
    'LABOR',
    'COMMERCIAL',
] as const;

export const FIRST_INSTANCE_DEGREES: readonly FirstInstanceDegree[] = [
    'FIRST_DEGREE',
    'FINAL_DEGREE',
] as const;

export function isStageOutcome(value: unknown): value is StageOutcome {
    return typeof value === 'string' && (STAGE_OUTCOMES as readonly string[]).includes(value);
}

export function isJudgmentFormType(value: unknown): value is JudgmentFormType {
    return typeof value === 'string' && (JUDGMENT_FORM_TYPES as readonly string[]).includes(value);
}

export function isCourtJurisdiction(value: unknown): value is CourtJurisdiction {
    return typeof value === 'string' && (COURT_JURISDICTIONS as readonly string[]).includes(value);
}

export function isFirstInstanceDegree(value: unknown): value is FirstInstanceDegree {
    return typeof value === 'string' && (FIRST_INSTANCE_DEGREES as readonly string[]).includes(value);
}
