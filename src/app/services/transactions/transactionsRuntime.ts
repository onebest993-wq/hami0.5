// Legacy compatibility shim for stale IDE tabs and old imports.
// Keep runtime imports relative to avoid alias-resolution false positives
// in editor-only contexts.
export { TransactionDB, TransactionsThreadingDB } from '../cloud/lawyerTransactionsCloud';
export type {
    TransactionsThreadingSaveInput,
    TransactionsThreadingState,
} from '../cloud/lawyerTransactionTypes';
