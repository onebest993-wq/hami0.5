import type { CriminalCaseUserRole } from './complainantCassationGovernance';
import type { StageConclusion } from './criminalCaseModel';
import type { DecisionPresenceType } from './decisionAppealPeriodEngine';

/** أنواع القرار الختامي للمرحلة — القائمة الرئيسية في النموذج. */
export type StageFinalDecisionKind =
    | 'conviction_penalty'
    | 'acquittal'
    | 'release'
    | 'criminal_expiration'
    | 'settlement_waiver';

export type MasterPenaltyKind =
    | 'severe_imprisonment'
    | 'simple_imprisonment'
    | 'fine'
    | 'combined_imprisonment_fine';

export type StageFinalPenaltyBlock = {
    masterKind: MasterPenaltyKind;
    years?: number;
    months?: number;
    fineAmountIqd?: number;
    substituteImprisonmentDays?: number;
    substituteImprisonmentMonths?: number;
    suspendedExecution?: boolean;
    suspendedExecutionReason?: string;
    penalties_supplementary?: string | null;
    /**
     * @deprecated KEEP — يُقرأ في stageFinalDecisionEngine + verdictCardsEngine عند ترحيل عقوبة محفوظة قديمة.
     * استخدم penalties_supplementary للكتابة الجديدة.
     */
    accessory_penalties?: string;
};

export type StageFinalDecisionProcedurePath = 'summary' | 'full';

export type StageFinalDecisionFormPayload = {
    kind: StageFinalDecisionKind;
    issuedAt: string;
    presenceType: DecisionPresenceType;
    decisionText: string;
    penalty?: StageFinalPenaltyBlock;
    defendantIds?: string[];
    expirationReason?: StageConclusion['expirationReason'];
    decisionPath?: StageFinalDecisionProcedurePath;
    convictionText?: string;
};

export type StageFinalDecisionBadgeTone =
    | 'countdown_orange'
    | 'final_green'
    | 'absentee_gray'
    | 'absentee_objection'
    | 'cassation_review'
    | 'cassation_result'
    | 'neutral';

export type StageFinalDecisionBadge = {
    label: string;
    tone: StageFinalDecisionBadgeTone;
};

export type StageFinalDecisionCardActions = {
    showCassationAppeal: boolean;
    showAbsentiaPublication: boolean;
    showAbsentiaObjection: boolean;
    showComplainantCassation: boolean;
    showRecordCassationResult: boolean;
    showCassationCorrection: boolean;
};

export type StageFinalDecisionUserRole = CriminalCaseUserRole | 'lawyer_of_defendant' | 'lawyer_of_claimant';

export type StageFinalDecisionActionsContext = {
    readOnly?: boolean;
    referenceDate?: Date;
    userRole?: StageFinalDecisionUserRole;
    caseStage?: import('@/app/types/criminal').CaseStage;
};

export const STAGE_FINAL_DECISION_KIND_OPTIONS: { value: StageFinalDecisionKind; label: string }[] = [
    { value: 'conviction_penalty', label: 'إدانة وعقوبة' },
    { value: 'acquittal', label: 'براءة' },
    { value: 'release', label: 'إفراج' },
    { value: 'criminal_expiration', label: 'انقضاء/سقوط الدعوى الجزائية' },
    { value: 'settlement_waiver', label: 'قبول الصلح والتنازل' },
];

/** خيارات الحسم الموضوعي — المسار الكامل (جناية / جنحة غير موجزة). */
export const FULL_STAGE_FINAL_DECISION_KIND_OPTIONS: { value: StageFinalDecisionKind; label: string }[] = [
    { value: 'conviction_penalty', label: 'إدانة وعقوبة' },
    { value: 'acquittal', label: 'براءة' },
    { value: 'release', label: 'إفراج' },
    { value: 'criminal_expiration', label: 'انقضاء الدعوى الجزائية' },
];

/** عقوبات المسار الموجز — غرامة أو حبس بسيط فقط. */
export const SUMMARY_PENALTY_KIND_OPTIONS: { value: MasterPenaltyKind; label: string }[] = [
    { value: 'fine', label: 'غرامة مالية' },
    { value: 'simple_imprisonment', label: 'حبس بسيط' },
];

export const MASTER_PENALTY_OPTIONS: { value: MasterPenaltyKind; label: string }[] = [
    { value: 'severe_imprisonment', label: 'سجن / حبس شديد' },
    { value: 'simple_imprisonment', label: 'حبس بسيط' },
    { value: 'fine', label: 'غرامة مالية' },
    { value: 'combined_imprisonment_fine', label: 'عقوبة مركبة: حبس وغرامة' },
];

export const MS_PER_DAY = 86_400_000;

export const MISDEMEANOR_MAX_IMPRISONMENT_YEARS = 5;
