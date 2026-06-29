import { TransactionStatus, type Transaction } from '@/app/modules/transactionsThreading/types';

export type TransactionsListStatusFilter = 'all' | TransactionStatus;

export function filterTransactionsList(
    transactions: Transaction[],
    query: string,
    filter: TransactionsListStatusFilter,
): Transaction[] {
    const q = query.trim().toLowerCase();
    return transactions.filter((tx) => {
        const matchesStatus = filter === 'all' ? true : tx.status === filter;
        const matchesQuery =
            q.length === 0 ||
            tx.title.toLowerCase().includes(q) ||
            tx.clientName.toLowerCase().includes(q);
        return matchesStatus && matchesQuery;
    });
}
