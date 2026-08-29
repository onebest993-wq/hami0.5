export type {
    ConsolidationSpawnContext,
    ConsolidationMergeMeta,
    ConsolidationCandidate,
} from './caseConsolidationHelpers';

export {
    resolveActiveStageName,
    assertConsolidationStageCompatibility,
    alignSecondaryFileLitigationStage,
    formatConsolidatedChipLabel,
    readConsolidationSecondaryRefs,
    resolveOpenLawsuitFileIdentity,
} from './caseConsolidationHelpers';

/** إذا أُدمجت الإضبارة في أخرى — افتح الإضبارة الموحّدة بدل المؤرشفة */
export { resolveConsolidationMergedOpenTarget } from './consolidationOpenTarget';

export {
    listConsolidationCandidates,
    assertDistinctConsolidationPair,
} from './caseConsolidationCandidates';

export {
    addExternalConsolidationRef,
    mergeLawsuitFilesForConsolidation,
} from './caseConsolidationMerge';
