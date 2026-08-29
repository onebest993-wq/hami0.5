import { describe, expect, it } from 'vitest';
import {
    collectTaskCascadeIds,
    documentListUnchanged,
    taskListUnchanged,
    transactionListUnchanged,
} from '@/app/modules/transactionsThreading/transactionsThreadingStoreMaps';
import {
    TransactionStatus,
    TransactionTaskStatus,
    type Transaction,
    type TransactionDocument,
    type TransactionTask,
} from '@/app/modules/transactionsThreading/types';

function task(id: string, parentTaskId: string | null): TransactionTask {
    return {
        id,
        transactionId: 'tx-1',
        title: id,
        status: TransactionTaskStatus.Pending,
        parentTaskId,
        notes: null,
        deadline: null,
        officialReference: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        completedAt: null,
    };
}

describe('collectTaskCascadeIds', () => {
    it('يجمع المهمة وأبناءها المتفرعين', () => {
        const ids = collectTaskCascadeIds('a', [task('a', null), task('b', 'a'), task('c', 'b'), task('d', null)]);
        expect([...ids].sort()).toEqual(['a', 'b', 'c']);
    });
});

describe('list unchanged fingerprints', () => {
    const tx = (id: string, title = 'معاملة'): Transaction => ({
        id,
        title,
        clientName: 'موكل',
        targetDepartment: 'دائرة',
        status: TransactionStatus.Active,
        agreedFees: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
    });

    it('يعتبر قائمتين متساويتين عند تطابق البصمة ولو اختلف المرجع', () => {
        expect(transactionListUnchanged([tx('a')], [tx('a')])).toBe(true);
        expect(transactionListUnchanged([tx('a')], [tx('a', 'عنوان آخر')])).toBe(false);
        expect(taskListUnchanged([task('a', null)], [task('a', null)])).toBe(true);
        expect(taskListUnchanged(undefined, [])).toBe(true);
        const doc = (id: string): TransactionDocument => ({
            id,
            transactionId: 'tx-1',
            type: 'pdf',
            title: 'مستمسك',
            ownerTag: 'للموكل',
            uploadedAt: '2026-01-01T00:00:00.000Z',
        });
        expect(documentListUnchanged([doc('d1')], [doc('d1')])).toBe(true);
        expect(documentListUnchanged([doc('d1')], [doc('d2')])).toBe(false);
    });
});
