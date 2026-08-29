/**
 * Barrel: domain isolation — public import path unchanged.
 */
export type {
    ExecutionClaimModule,
    ExecutionJurisdictionDomain,
    ExecutorRequestKind,
    ExecutionDomainContext,
    DomainGateResult,
    ExecutorRequestGateMeta,
    HiddenGuarantorCatalogKey,
} from './executionDomainIsolationTypes';

export {
    COMMUNICATION_JOURNAL_TITLE_KEYWORD,
    isCommunicationJournalTitle,
} from './executionDomainIsolationTypes';

export {
    readExecutionDataForDomainGate,
    resolveExecutionDataForDomainGate,
} from './executionDomainIsolationRead';

export {
    resolveExecutionDomainContext,
    resolveFollowupFlagsFromExecution,
    resolveFollowupFlagsForDebtorContext,
    buildDomainReconcileSignature,
} from './executionDomainIsolationContext';

export {
    isDecisionVisibleInDomainContext,
    filterDecisionsForDomainContext,
} from './executionDomainIsolationVisibility';

export {
    canPersistExecutorRequestKind,
    gateExecutorRequestPersist,
    DOMAIN_ISOLATION_BLOCKED_EVENT,
    hiddenGuarantorCatalogKeyToRequestKind,
    isHiddenGuarantorCatalogItemAllowed,
    isHiddenPersonalCoerciveCatalogAllowed,
    isHiddenBreakInventoryRequestAllowed,
    otherPartyCatalogIdToRequestKind,
    isOtherPartyCatalogOptionAllowed,
    filterOtherPartyCatalogOptionIds,
    isFollowupRequestKindAllowed,
    dispatchDomainIsolationBlocked,
} from './executionDomainIsolationGates';
