import { TransactionStatus, type Transaction } from '@/app/modules/transactionsThreading/types';
import { normalizeArabicSearch } from '@/app/services/search/normalizeArabicSearch';

export type TransactionsListStatusFilter = 'all' | TransactionStatus;

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

export function filterTransactionsList(
    transactions: Transaction[],
    query: string,
    filter: TransactionsListStatusFilter,
): Transaction[] {
    const normalizedQuery = normalizeSearchToken(query.trim());
    return transactions.filter((tx) => {
        const matchesStatus = filter === 'all' ? true : tx.status === filter;
        return matchesStatus && transactionMatchesQuery(tx, normalizedQuery);
    });
}
