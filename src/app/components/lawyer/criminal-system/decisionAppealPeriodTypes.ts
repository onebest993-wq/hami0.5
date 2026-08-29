import type { CriminalCaseUserRole } from './complainantCassationGovernance';

/** وجاهي / غيابي — م 249 وما يليها. */
export type DecisionPresenceType = 'وجاهي' | 'غيابي';

/** نوع الجريمة لاحتساب مدة الغياب. */
export type DecisionCaseType = 'جناية' | 'جنحة' | 'مخالفة';

/** تصنيف قابلية الطعن — م 249 / 267. */
export type DecisionAppealabilityCategory =
    | 'قابل للطعن على انفراد'
    | 'غير قابل للطعن على انفراد'
    | 'قرار تمييزي';

export type DecisionAppealLifecycleFields = {
    decisionPresenceType: DecisionPresenceType;
    decisionCaseType: DecisionCaseType;
    decisionAppealability: DecisionAppealabilityCategory;
    issuedDate: string;
    isAppealed: boolean;
    appealResult: string;
    isJudgmentFinalDeclared: boolean;
    cassationPapersReceivedAt?: string;
};

export type AppealPeriodSnapshot = {
    totalLegalDays: number;
    remainingDays: number;
    isPeriodExpired: boolean;
    periodStartExclusive: string;
};

export type DecisionAppealActionKind =
    | 'cassation_appeal'
    | 'intervention_cassation'
    | 'cassation_correction'
    | 'declare_judgment_final'
    | 'record_appeal_result';

export type DecisionAppealBadgeTone =
    | 'review'
    | 'countdown'
    | 'period_expired'
    | 'preparatory_final'
    | 'absolute_finality'
    | 'quashed'
    | 'manual_final'
    | 'result';

export type DecisionAppealBadgeView = {
    label: string;
    tone: DecisionAppealBadgeTone;
};

export type DecisionAppealStatePhase =
    | 'manual_final'
    | 'not_appealed'
    | 'under_cassation_review'
    | 'upheld_correction_window'
    | 'upheld_absolute_final'
    | 'quashed_final';

/** مدة الطعن التمييزي العادي للقرارات القابلة للطعn — 30 يوماً. */
export const ORDINARY_CASSATION_WINDOW_DAYS = 30;

/** مهلة التصحيح بعد التأييد — م 266. */
export const CASSATION_CORRECTION_WINDOW_DAYS = 30;

export type CassationCorrectionUserRole =
    | CriminalCaseUserRole
    | 'lawyer_of_defendant'
    | 'lawyer_of_claimant';

export type CassationCorrectionDecisionOutcome = 'conviction' | 'acquittal' | '';

export type CassationCorrectionEligibilityInput = {
    cassationResultRaw: string;
    issuedBy?: string;
    resultRecordedAt?: string;
    decisionOutcome: CassationCorrectionDecisionOutcome;
    userRole?: CassationCorrectionUserRole;
    referenceDate?: Date;
    correctionAlreadyPending?: boolean;
    correctionAlreadyFiled?: boolean;
};
