import { TransactionStatus, type Transaction } from '@/app/modules/transactionsThreading/types';
import { normalizeArabicSearch } from '@/app/services/search/normalizeArabicSearch';

export type TransactionsListStatusFilter = 'all' | TransactionStatus | 'archived' | 'deleted';

function normalizeSearchToken(text: string): string {
    return normalizeArabicSearch(text).toLowerCase();
}

function transactionMatchesQuery(tx: Transaction, normalizedQuery: string): boolean {
    if (!normalizedQuery) return true;
    return (
        normalizeSearchToken(tx.title).includes(normalizedQuery) ||
        normalizeSearchToken(tx.clientName).includes(normalizedQuery) ||
        normalizeSearchToken(tx.targetDepartment).includes(normalizedQuery)
    );
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
    const normalizedQuery = normalizeSearchToken(query.trim());
    return transactions.filter((tx) => {
        return matchesListBucket(tx, filter) && transactionMatchesQuery(tx, normalizedQuery);
    });
}
