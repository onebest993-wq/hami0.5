/**
 * Public judicial-decisions engine API — barrel re-exporting split modules.
 * Import path `./judicialDecisionsEngine` is preserved for all consumers.
 */

export type { CassationAppealAudienceContext, CriminalCaseUserRole } from './complainantCassationGovernance';
export { resolveCriminalCaseUserRole } from './complainantCassationGovernance';

export type { JudicialDecision, JudicialDecisionAppeal } from '@/app/types/criminal';

export {
    canFileDefendantCassationAppeal,
    canOpenCassationAppealModal,
    canShowCassationAppealFileButton,
    filterDefendantPartiesForDecision,
    inferJudicialDecisionKind,
    inferJudicialDisposition,
    isDecisionFullyFavorableToDefendants,
    resolveAutoAppellantPartyIds,
    resolveAutoAppellantSideForDecision,
} from './judicialDecisionEligibility';

export {
    canRecordCassationAppealResult,
    decisionAlreadyHasCassationAppeal,
    decisionHasActiveAppealOfPath,
    filterRecordedCassationAppeals,
    formatJudicialAppealAppellantLabel,
    formatJudicialAppealPathLabel,
    formatRectificationBadge,
    getJudicialDecisionAppealsOfPath,
    getLatestJudicialAppealOfPath,
    getPendingCassationAppealForResult,
    hasJudicialAppealBeenFiledOnPath,
    isCassationAppealResultFinalized,
    isPendingJudicialAppealForResult,
    isRecordedCassationAppealConcluded,
    latestConcludedAppealWithBeneficiary,
    mergeJudicialDecisionAppeals,
    normalizeJudicialAppealPath,
    resolveJudicialInterventionAppealStatusLabel,
} from './judicialDecisionCassationHelpers';

export {
    coalesceJudicialDecisions,
    findJudicialDecisionByRef,
    findJudicialDecisionStoreIndex,
    formatJudicialLedgerDate,
    judicialDecisionPersistKey,
    lawyerRequestToJudicialDecision,
    mergeJudicialDecisionsFromRequests,
    normalizeJudicialDecision,
    resolveDefendantStatusFromJudicialDecisions,
    sortJudicialDecisionsChronologically,
    sortJudicialDecisionsNewestFirst,
} from './judicialDecisionListHelpers';
