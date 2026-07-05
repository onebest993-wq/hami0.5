import { describe, expect, it } from 'vitest';
import { groupThreadingSeedForStore } from '@/app/modules/transactionsThreading/transactionsThreadingStoreSeed';
import { TransactionStatus, TransactionTaskStatus } from '@/app/modules/transactionsThreading/types';

describe('groupThreadingSeedForStore', () => {
    it('يجمّع المهام والمالية والمستندات حسب transactionId', () => {
        const grouped = groupThreadingSeedForStore({
            transactions: [
                {
                    id: 'tx-1',
                    title: 'معاملة',
                    clientName: 'عميل',
                    status: TransactionStatus.Active,
                    agreedFees: 0,
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                },
            ],
            tasks: [
                {
                    id: 'task-1',
                    transactionId: 'tx-1',
                    title: 'مهمة',
                    status: TransactionTaskStatus.Pending,
                    parentTaskId: null,
                    notes: null,
                    deadline: null,
                    officialReference: null,
                    createdAt: '2026-01-01T00:00:00.000Z',
                    completedAt: null,
                },
            ],
            financeRecords: [],
            documents: [],
        });

        expect(grouped.transactions).toHaveLength(1);
        expect(grouped.tasksByTransactionId['tx-1']).toHaveLength(1);
        expect(grouped.financeByTransactionId['tx-1']).toBeUndefined();
        expect(grouped.documentsByTransactionId['tx-1']).toBeUndefined();
    });
});
