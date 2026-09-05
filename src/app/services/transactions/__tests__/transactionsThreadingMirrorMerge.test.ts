import { describe, expect, it } from 'vitest';
import {
    mergeThreadingRecordsById,
    mergeTransactionsThreadingStates,
    parseTransactionsThreadingState,
} from '@/app/services/transactions/transactionsThreadingMirror';
import type { TransactionsThreadingState } from '@/app/services/cloud/lawyerTransactionTypes';

function state(
    partial: Partial<TransactionsThreadingState> & Pick<TransactionsThreadingState, 'transactions'>,
): TransactionsThreadingState {
    return {
        schemaVersion: 1,
        userId: 'u1',
        updatedAt: partial.updatedAt ?? '2026-01-01T00:00:00.000Z',
        transactions: partial.transactions,
        tasks: partial.tasks ?? [],
        documents: partial.documents ?? [],
    };
}

describe('mergeTransactionsThreadingStates', () => {
    it('لا يستبدل المحلي الغني بسحابة فارغة أحدث زمنياً', () => {
        const local = state({
            updatedAt: '2026-01-01T10:00:00.000Z',
            transactions: [{ id: 'tx-1', title: 'محلية', updatedAt: '2026-01-01T10:00:00.000Z' }],
        });
        const remote = state({
            updatedAt: '2026-01-02T00:00:00.000Z',
            transactions: [],
        });

        const merged = mergeTransactionsThreadingStates(local, remote);
        expect(merged?.transactions).toHaveLength(1);
        expect((merged?.transactions[0] as { id: string }).id).toBe('tx-1');
    });

    it('يدمج سجلات الطرفين بالـ id', () => {
        const local = state({
            transactions: [{ id: 'a', title: 'A-local', updatedAt: '2026-01-02T00:00:00.000Z' }],
        });
        const remote = state({
            transactions: [
                { id: 'a', title: 'A-remote', updatedAt: '2026-01-01T00:00:00.000Z' },
                { id: 'b', title: 'B-remote', updatedAt: '2026-01-01T00:00:00.000Z' },
            ],
        });

        const merged = mergeTransactionsThreadingStates(local, remote);
        const ids = (merged?.transactions ?? []).map((t) => (t as { id: string }).id).sort();
        expect(ids).toEqual(['a', 'b']);
        expect((merged?.transactions.find((t) => (t as { id: string }).id === 'a') as { title: string }).title).toBe(
            'A-local',
        );
    });

    it('mergeThreadingRecordsById يبقي المحلي عند التعادل', () => {
        const result = mergeThreadingRecordsById(
            [{ id: '1', title: 'local', updatedAt: '2026-01-01T00:00:00.000Z' }],
            [{ id: '1', title: 'remote', updatedAt: '2026-01-01T00:00:00.000Z' }],
        );
        expect((result[0] as { title: string }).title).toBe('local');
    });

    it('لا يحتفظ بحركات مالية مهجورة من أي طرف', () => {
        const local = {
            ...state({ transactions: [{ id: 'tx-1' }] }),
            financeRecords: [{ id: 'f-local', amount: 10 }],
        };
        const remote = {
            ...state({ transactions: [{ id: 'tx-1' }] }),
            financeRecords: [{ id: 'f-remote', amount: 20 }],
        };
        const merged = mergeTransactionsThreadingStates(local, remote);
        expect(merged).not.toHaveProperty('financeRecords');
    });

    it('حمولة قديمة فيها financeRecords تُقرأ دون إسقاط المعاملات ودون الإبقاء على المالية', () => {
        const parsed = parseTransactionsThreadingState('u1', {
            schemaVersion: 1,
            userId: 'u1',
            updatedAt: '2026-01-01T00:00:00.000Z',
            transactions: [
                {
                    id: 'tx-1',
                    title: 'معاملة',
                    clientName: 'موكل',
                    targetDepartment: 'دائرة',
                    status: 'Active',
                    agreedFees: 40,
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                },
            ],
            tasks: [],
            financeRecords: [{ id: 'f1', amount: 10 }],
            documents: [],
        });
        expect(parsed?.transactions).toHaveLength(1);
        expect(parsed?.transactions[0]).not.toHaveProperty('agreedFees');
        expect(parsed).not.toHaveProperty('financeRecords');
    });

    it('حمولة بلا financeRecords تُقبل', () => {
        const parsed = parseTransactionsThreadingState('u1', {
            schemaVersion: 1,
            userId: 'u1',
            updatedAt: '2026-01-01T00:00:00.000Z',
            transactions: [],
            tasks: [],
            documents: [],
        });
        expect(parsed).not.toBeNull();
        expect(parsed).not.toHaveProperty('financeRecords');
    });
});
