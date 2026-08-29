/**
 * Facade for investigation defendant purge / dossier closure helpers.
 * Implementation lives in scoped modules; this path preserves all prior public exports.
 */
export {
    formatInvestigationPurgeDecisionDisplayTitle,
    isInvestigationImmediatePurgeTemplate,
    isInvestigationClosureAppealablePurgeTemplate,
    isInvestigationPurgeDecisionTemplate,
    isInvestigationStructuralCassationTemplate,
} from './proceduralRequestTypes';

export type { InvestigationDefendantStatus } from '@/app/types/investigationDefendant';
export { DEFAULT_INVESTIGATION_DEFENDANT_STATUS } from '@/app/types/investigationDefendant';

export type { InvestigationDossierClosure, InvestigationDossierClosureKind } from './criminalStore';

export {
    isInvestigationFinalClosureTemplate,
    isInvestigationObjectiveFinalClosureTemplate,
    investigationDossierSealMessage,
    investigationDossierIsTemporarilyClosed,
    shouldSealInvestigationDossierAfterPurge,
    investigationDossierIsSealed,
    investigationDossierMaterialMutationBlocked,
    otherEvidenceMutationBlocked,
    investigationStatementsMutationBlocked,
    investigationLogsMutationBlocked,
} from './investigationDossierClosureUtils';

export {
    shouldShowInvestigationDefendantScopePicker,
    caseAllowsSeveranceOrDossierStrike,
    countSeveranceSelectableDefendants,
    caseAllowsDefendantSeverance,
    filterSeveranceSelectableDefendants,
    validateDefendantSeveranceSelection,
    validateSeveranceOrDossierStrikePartyRule,
    normalizeInvestigationDefendantStatus,
    filterActiveInvestigationDefendants,
    filterVisibleInvestigationDefendants,
    resolveVisibleInvestigationDefendants,
    filterStatementEligibleDefendants,
    resolvePurgeDecisionDefendantIds,
    resolvePurgeCassationRestoreDefendantIds,
    resolveInvestigationClosureDefendantIds,
    formatInvestigationDecisionDefendantNames,
    requiresInvestigationPurgeDefendantScope,
    INVESTIGATION_PURGE_CASSATION_RESULT_OPTIONS,
    validateInvestigationPurgeCassationResult,
    investigationPurgeDecisionAllowsCassationAppeal,
    resolveInvestigationPurgeCassationContext,
} from './investigationDefendantScopeUtils';

export {
    endInvestigationTemporaryClosureOnCase,
    patchDefendantsInvestigationStatus,
    decisionAllowsInvestigationClosureAccept,
    applyInvestigationClosureFromStageConclusion,
    reopenInvestigationDefendantsOnCase,
    applyInvestigationClosureFromRequest,
    applyInvestigationPurgeAfterCassation,
} from './investigationDefendantPurgeApply';
