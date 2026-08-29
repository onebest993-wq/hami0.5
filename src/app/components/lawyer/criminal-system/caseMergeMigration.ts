/**
 * Case merge & consolidation engine — barrel re-export.
 * Import path `./caseMergeMigration` preserved.
 */

export type { MergeValidationCode } from './caseMergeMigrationTypes';
export { MergeValidationError } from './caseMergeMigrationTypes';
export { validateCaseMerge } from './caseMergeMigrationValidate';
export type { ConsolidatedParties } from './caseMergeMigrationParties';
export {
    consolidatePartiesAfterMerge,
    formatMergeProvenanceBadge,
} from './caseMergeMigrationParties';
export type { MergedCaseTransactionResult } from './caseMergeMigrationPrepare';
export {
    prepareMergedCaseTransaction,
    resolveLinkedMergedChildCaseId,
} from './caseMergeMigrationPrepare';
export { revertCaseMergeAfterCassationAnnulment } from './caseMergeMigrationRevert';
