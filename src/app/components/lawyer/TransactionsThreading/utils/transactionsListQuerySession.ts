import type { TransactionsListStatusFilter } from '@/app/services/transactions/filterTransactionsList';

type TransactionsListQuerySession = {
    query: string;
    filter: TransactionsListStatusFilter;
};

let session: TransactionsListQuerySession = { query: '', filter: 'all' };

export function readTransactionsListQuerySession(): TransactionsListQuerySession {
    return { query: session.query, filter: session.filter };
}

export function writeTransactionsListQuerySession(next: TransactionsListQuerySession): void {
    session = { query: next.query, filter: next.filter };
}

export function clearTransactionsListQuerySession(): void {
    session = { query: '', filter: 'all' };
}
