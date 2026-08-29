/**
 * Barrel: urgent case card — public import path unchanged.
 */
export type {
    UrgentCaseStatus,
    UrgentCaseType,
    ActionPhase,
    LegalState,
    CaseNote,
    CaseAttachment,
    CaseFollowup,
    InitialNotificationMethod,
    HearingStage,
    CaseHearing,
    ExpertModule,
    CasePartyEntry,
    UrgentCase,
} from './Component_Urgent_Card.types';

export {
    computeUrgentCaseStatus,
    getUrgentCasePhaseLabel,
    hasUrgentGrievanceLogged,
    isUrgentCaseClosed,
    isUrgentCaseFinalized,
    isUrgentCaseInActiveScope,
    isUrgentCaseInArchiveScope,
    isUrgentCaseTrashed,
    isUrgentJudgeDecisionRecorded,
    isUrgentJudgeDecisionValue,
    isUrgentJudgeGrant,
    URGENT_GRIEVANCE_DAYS,
    URGENT_MS_PER_DAY,
    urgentDaysUntil,
    urgentGrievanceDeadline,
    urgentStartOfDay,
} from './Component_Urgent_Card.status';

export { Component_Urgent_Card } from './Component_Urgent_CardView';
