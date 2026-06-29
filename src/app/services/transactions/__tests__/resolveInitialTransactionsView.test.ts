import { describe, expect, it } from 'vitest';
import { TransactionStatus } from '@/app/modules/transactionsThreading/types';
import { resolveInitialTransactionsView } from '@/app/services/transactions/resolveInitialTransactionsView';

const sample = [
    {
        id: 'tx-1',
        title: 'A',
        clientName: 'B',
        targetDepartment: 'C',
        status: TransactionStatus.Active,
        createdAt: '',
        updatedAt: '',
        agreedFees: 0,
    },
];

describe('resolveInitialTransactionsView', () => {
    it('يفتح القائمة بدون معرّف', () => {
        expect(resolveInitialTransactionsView(undefined, sample)).toEqual({
            view: 'list',
            selectedId: null,
            missingFocusId: false,
        });
    });

    it('يفتح التفاصيل عند وجود المعاملة', () => {
        expect(resolveInitialTransactionsView('tx-1', sample)).toEqual({
            view: 'details',
            selectedId: 'tx-1',
            missingFocusId: false,
        });
    });

    it('يرفض معرّفاً غير موجود', () => {
        expect(resolveInitialTransactionsView('missing', sample)).toEqual({
            view: 'list',
            selectedId: null,
            missingFocusId: true,
        });
    });
});
