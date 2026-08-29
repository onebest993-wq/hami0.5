/**
 * Public stage-final-decision engine API — barrel re-exporting split modules.
 * Import path `./stageFinalDecisionEngine` is preserved for all consumers.
 */

export { applyAbsentiaObjectionExpiry } from './verdictCardAbsentiaExpiry';
export {
    resolveAbsentiaObjectionDeadline,
    resolveAbsentiaObjectionDays,
} from './absentiaObjectionSchedule';
export { ORDINARY_CASSATION_WINDOW_DAYS } from './decisionAppealPeriodEngine';

export type {
    MasterPenaltyKind,
    StageFinalDecisionBadgeTone,
    StageFinalDecisionFormPayload,
    StageFinalDecisionKind,
    StageFinalPenaltyBlock,
    StageFinalDecisionProcedurePath,
    StageFinalDecisionUserRole,
} from './stageFinalDecisionTypes';

export {
    FULL_STAGE_FINAL_DECISION_KIND_OPTIONS,
    MASTER_PENALTY_OPTIONS,
    MISDEMEANOR_MAX_IMPRISONMENT_YEARS,
    SUMMARY_PENALTY_KIND_OPTIONS,
} from './stageFinalDecisionTypes';

export {
    formatPenaltyDisplay,
    resolvePenaltiesSupplementary,
    stageFinalDecisionKindLabel,
} from './stageFinalDecisionPenalty';

export {
    buildStageConclusionFromForm,
    enrichVerdictCardFromForm,
    inferDecisionCaseTypeFromContext,
    inferDecisionCaseTypeFromStage,
    validateStageFinalDecisionForm,
} from './stageFinalDecisionForm';

export { resolveStageFinalDecisionBadge } from './stageFinalDecisionBadge';

export {
    canShowStageFinalCassationAppealByRole,
    resolveStageFinalDecisionActions,
} from './stageFinalDecisionActions';
