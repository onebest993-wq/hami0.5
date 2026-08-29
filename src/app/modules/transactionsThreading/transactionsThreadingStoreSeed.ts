import type { Transaction, TransactionDocument, TransactionTask } from './types';

export type ThreadingRepositorySeed = {
    transactions?: Transaction[];
    tasks?: TransactionTask[];
    financeRecords?: unknown[];
    documents?: TransactionDocument[];
};

export function groupThreadingSeedForStore(seed: ThreadingRepositorySeed) {
    const tasksByTransactionId: Record<string, TransactionTask[]> = {};
    for (const task of seed.tasks ?? []) {
        if (!tasksByTransactionId[task.transactionId]) {
            tasksByTransactionId[task.transactionId] = [];
        }
        tasksByTransactionId[task.transactionId].push(task);
    }

    const documentsByTransactionId: Record<string, TransactionDocument[]> = {};
    for (const doc of seed.documents ?? []) {
        if (!documentsByTransactionId[doc.transactionId]) {
            documentsByTransactionId[doc.transactionId] = [];
        }
        documentsByTransactionId[doc.transactionId].push(doc);
    }

    return {
        transactions: seed.transactions ?? [],
        tasksByTransactionId,
        documentsByTransactionId,
    };
}
