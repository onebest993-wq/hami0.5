/**
 * Public decision-appeal-period engine API — barrel re-exporting split modules.
 * Import path `./decisionAppealPeriodEngine` is preserved for all consumers.
 */

export { resolveStageCassationButtonFlags, type StageCassationButtonFlags } from './stageCassationActionGates';

export type {
    AppealPeriodSnapshot,
    CassationCorrectionDecisionOutcome,
    CassationCorrectionEligibilityInput,
    CassationCorrectionUserRole,
    DecisionAppealabilityCategory,
    DecisionAppealActionKind,
    DecisionAppealBadgeTone,
    DecisionAppealBadgeView,
    DecisionAppealLifecycleFields,
    DecisionAppealStatePhase,
    DecisionCaseType,
    DecisionPresenceType,
} from './decisionAppealPeriodTypes';

export {
    CASSATION_CORRECTION_WINDOW_DAYS,
    ORDINARY_CASSATION_WINDOW_DAYS,
} from './decisionAppealPeriodTypes';

export {
    addCalendarDaysIso,
    computeAppealPeriodSnapshot,
    computeOrdinaryCassationWindow,
    resolveAppealPeriodStartExclusive,
    resolveCassationCorrectionRemainingDaysForAnchor,
    resolveOrdinaryCassationLastDayInclusive,
    resolveTotalAppealLegalDays,
} from './decisionAppealPeriodCalendar';

export {
    inferDecisionAppealability,
    inferDecisionCaseType,
    inferDecisionPresenceType,
} from './decisionAppealPeriodInference';

export {
    formatAppealResultLabel,
    resolveAppealResultCategory,
    resolveAppealResultRecordedAt,
    resolveStoredAppealResultRaw,
} from './decisionAppealPeriodResults';

export {
    buildDefaultAppealFieldsForNewDecision,
    enrichJudicialDecisionAppealFields,
    resolveCassationCorrectionRemainingDays,
    resolveDecisionAppealLifecycle,
    resolveDecisionAppealStatePhase,
} from './decisionAppealPeriodLifecycle';

export {
    canShowCassationCorrectionButton,
    canShowCassationCorrectionForJudicialDecision,
    hasCassationCorrectionPartyInterest,
    isCassationCorrectionBlockedByArticle267,
    isCassationIssuedByGeneralAssembly,
    isCassationResultAffirmationUpheld,
    isCassationResultQuashRemand,
    resolveJudicialCassationCorrectionOutcome,
    resolveJudicialCassationIssuedBy,
} from './decisionAppealPeriodCorrection';

export {
    resolveDecisionAppealActions,
    resolveDecisionAppealBadge,
    shouldShowCassationAppealFileAction,
} from './decisionAppealPeriodActions';
