import { describe, expect, it } from 'vitest';
import { sanitizeTransactionsThreadingSaveInput } from '@/app/services/transactions/sanitizeTransactionsThreadingPersist';
import { TransactionStatus, TransactionTaskStatus, FinanceRecordType } from '@/app/modules/transactionsThreading/types';

describe('sanitizeTransactionsThreadingSaveInput', () => {
    it('يعقّم الحقول النصية ويفرغ المالية المهجورة قبل Persist', () => {
        const state = sanitizeTransactionsThreadingSaveInput('u1', {
            transactions: [
                {
                    id: 'tx-1',
                    title: '  عنوان\u0007  ',
                    clientName: '  موكل  ',
                    targetDepartment: '  دائرة  ',
                    status: TransactionStatus.Active,
                    agreedFees: 5000,
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                },
            ],
            tasks: [
                {
                    id: 't1',
                    transactionId: 'tx-1',
                    title: '  مهمة  ',
                    status: TransactionTaskStatus.Pending,
                    parentTaskId: null,
                    notes: '  ن  ',
                    deadline: null,
                    officialReference: '  رف  ',
                    createdAt: '2026-01-01T00:00:00.000Z',
                    completedAt: null,
                },
            ],
            financeRecords: [
                {
                    id: 'f1',
                    transactionId: 'tx-1',
                    type: FinanceRecordType.Expense,
                    amount: 10.456,
                    description: '  وصف\u0000  ',
                    date: '2026-01-01T00:00:00.000Z',
                },
            ],
            documents: [
                {
                    id: 'd1',
                    transactionId: 'tx-1',
                    type: '  نوع  ',
                    title: '  مستمسك  ',
                    ownerTag: 'للموكل',
                    uploadedAt: '2026-01-01T00:00:00.000Z',
                },
            ],
        });

        expect(state.userId).toBe('u1');
        expect(state.transactions[0]?.title).toBe('عنوان');
        expect(state.transactions[0]?.agreedFees).toBe(0);
        expect(state.tasks[0]?.title).toBe('مهمة');
        expect(state.tasks[0]?.officialReference).toBe('رف');
        expect(state.financeRecords).toEqual([]);
        expect(state.documents[0]?.title).toBe('مستمسك');
        expect(state.documents[0]?.type).toBe('نوع');
    });

    it('يحذف الحقول الدخيلة ويصحّح ownerTag غير المسموح', () => {
        const state = sanitizeTransactionsThreadingSaveInput('u1', {
            transactions: [
                {
                    id: 'tx-1',
                    title: 'عنوان',
                    clientName: 'موكل',
                    targetDepartment: 'دائرة',
                    status: TransactionStatus.Active,
                    agreedFees: 9,
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                    secret: 'leak',
                } as never,
            ],
            tasks: [],
            financeRecords: [],
            documents: [
                {
                    id: 'd1',
                    transactionId: 'tx-1',
                    type: 'نوع',
                    title: 'مستمسك',
                    ownerTag: 'هاكر',
                    uploadedAt: '2026-01-01T00:00:00.000Z',
                } as never,
            ],
        });
        expect(state.transactions[0]).not.toHaveProperty('secret');
        expect(state.transactions[0]?.agreedFees).toBe(0);
        expect(state.documents[0]?.ownerTag).toBe('أخرى');
        expect(state.financeRecords).toEqual([]);
    });
});
