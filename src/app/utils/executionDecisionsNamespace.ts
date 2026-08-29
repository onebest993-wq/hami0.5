/**
 * Barrel: decisions namespace — public import path unchanged.
 */
export {
    DECISIONS_NAMESPACE_INDEX_VERSION,
    type DecisionsNamespaceIndex,
    sanitizeDecisionsNamespaceSlug,
    buildDecisionsNamespaceSlug,
    buildDecisionsNamespaceSlugFromContext,
    executionDecisionsNamespaceStorageKey,
    executionDecisionsNamespaceIndexKey,
    executionDecisionsLegacyArchiveKey,
    isExecutorDecisionsStorageKey,
    readDecisionsNamespaceIndex,
} from './executionDecisionsNamespaceKeys';

export {
    resolveActiveDecisionsNamespaceSlug,
    resolveActiveDecisionsStorageKey,
    stampDecisionRowsWithNamespace,
    resolveDecisionRowNamespaceSlug,
} from './executionDecisionsNamespaceResolve';

export { ensureDecisionsNamespaceMigrated } from './executionDecisionsNamespaceMigrate';

export {
    readExecutorDecisionsFromActiveNamespace,
    readExecutorDecisionsUnionForExecution,
    readExecutorDecisionsUnionAcrossCandidateIds,
} from './executionDecisionsNamespaceRead';

export {
    pruneRedundantDecisionsStorageAliases,
    type ExecutorDecisionsPersistOptions,
    mergeExecutorDecisionsUnionForPersist,
    writeExecutorDecisionsUnionForExecution,
    writeExecutorDecisionsArray,
    seedFreshDecisionsNamespace,
    clearDecisionsNamespaceForTests,
    warmExecutorDecisionsStorage,
    flushExecutorDecisionsStorageImmediate,
    flushExecutorDecisionsStorageAwait,
} from './executionDecisionsNamespaceWrite';
