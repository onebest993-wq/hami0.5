import { TransactionStatus, type Transaction } from '@/app/modules/transactionsThreading/types';
import { archiveTextMatchesQuery } from '@/app/services/search/normalizeArabicSearch';
import { clampGlobalSearchQuery } from '@/app/services/search/globalSearchQuerySecurity';

export type TransactionsListStatusFilter = 'all' | TransactionStatus | 'archived' | 'deleted';

function transactionMatchesQuery(tx: Transaction, query: string): boolean {
    if (!query.trim()) return true;
    const hay = [tx.title, tx.clientName, tx.targetDepartment].join(' ');
    return archiveTextMatchesQuery(hay, query);
}

function isDeletedTransaction(tx: Transaction): boolean {
    return Boolean(tx.deletedAt);
}

function isArchivedTransaction(tx: Transaction): boolean {
    return Boolean(tx.archivedAt) && !isDeletedTransaction(tx);
}

function isPrimaryListTransaction(tx: Transaction): boolean {
    return !isDeletedTransaction(tx) && !tx.archivedAt;
}

function matchesListBucket(tx: Transaction, filter: TransactionsListStatusFilter): boolean {
    if (filter === 'deleted') return isDeletedTransaction(tx);
    if (filter === 'archived') return isArchivedTransaction(tx);
    if (!isPrimaryListTransaction(tx)) return false;
    if (filter === 'all') return true;
    return tx.status === filter;
}

export function filterTransactionsList(
    transactions: Transaction[],
    query: string,
    filter: TransactionsListStatusFilter,
): Transaction[] {
    const q = clampGlobalSearchQuery(query);
    return transactions.filter((tx) => {
        return matchesListBucket(tx, filter) && transactionMatchesQuery(tx, q);
    });
}
