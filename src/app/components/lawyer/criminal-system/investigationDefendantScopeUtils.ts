/**
 * Facade — investigation defendant scope helpers.
 * Implementation lives in scoped modules; this path preserves all prior public exports.
 */
export type { InvestigationDefendantStatus } from './investigationDefendantFilterScope';
export { DEFAULT_INVESTIGATION_DEFENDANT_STATUS } from './investigationDefendantFilterScope';

export {
    hasActiveInvestigationDefendants,
    shouldShowInvestigationDefendantScopePicker,
    normalizeInvestigationDefendantStatus,
    filterActiveInvestigationDefendants,
    filterVisibleInvestigationDefendants,
    resolveVisibleInvestigationDefendants,
    filterStatementEligibleDefendants,
} from './investigationDefendantFilterScope';

export {
    caseAllowsSeveranceOrDossierStrike,
    countSeveranceSelectableDefendants,
    caseAllowsDefendantSeverance,
    filterSeveranceSelectableDefendants,
    validateDefendantSeveranceSelection,
    validateSeveranceOrDossierStrikePartyRule,
} from './investigationDefendantSeveranceScope';

export {
    resolvePurgeDecisionDefendantIds,
    resolvePurgeCassationRestoreDefendantIds,
    resolveInvestigationClosureDefendantIds,
} from './investigationDefendantPurgeScopeIds';

export {
    formatInvestigationDecisionDefendantNames,
    requiresInvestigationPurgeDefendantScope,
    INVESTIGATION_PURGE_CASSATION_RESULT_OPTIONS,
    validateInvestigationPurgeCassationResult,
    investigationPurgeDecisionAllowsCassationAppeal,
    resolveInvestigationPurgeCassationContext,
} from './investigationDefendantPurgeCassationUi';
