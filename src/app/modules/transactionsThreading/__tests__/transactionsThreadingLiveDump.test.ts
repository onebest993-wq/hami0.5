import { describe, expect, it, beforeEach } from 'vitest';
import { TransactionStatus } from '@/app/modules/transactionsThreading/types';
import {
    ensureTransactionsUserBound,
    useTransactionsThreadingStore,
} from '@/app/modules/transactionsThreading/store';
import { emitTransactionsThreadingDump } from '@/app/services/transactions/transactionsThreadingDumpBridge';

const tx = {
    id: 'tx-live',
    title: 'من السحابة',
    clientName: 'موكل',
    targetDepartment: 'دائرة',
    status: TransactionStatus.Active,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('transactions threading live dump', () => {
    beforeEach(() => {
        ensureTransactionsUserBound('lawyer-dump-1');
    });

    it('يحدّث المخزن الحي لنفس المستخدم', () => {
        emitTransactionsThreadingDump('lawyer-dump-1', {
            transactions: [tx],
            tasks: [],
            documents: [],
        });
        expect(useTransactionsThreadingStore.getState().transactions[0]?.id).toBe('tx-live');
        expect(useTransactionsThreadingStore.getState().transactions[0]?.title).toBe('من السحابة');
    });

    it('يتجاهل مستخدماً آخر', () => {
        emitTransactionsThreadingDump('lawyer-dump-1', {
            transactions: [tx],
            tasks: [],
            documents: [],
        });
        emitTransactionsThreadingDump('other-lawyer', {
            transactions: [{ ...tx, id: 'tx-other', title: 'أجنبي' }],
            tasks: [],
            documents: [],
        });
        expect(useTransactionsThreadingStore.getState().transactions[0]?.id).toBe('tx-live');
    });
});
