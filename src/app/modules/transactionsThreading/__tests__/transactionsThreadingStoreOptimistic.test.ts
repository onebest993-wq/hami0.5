import { describe, expect, it, vi } from 'vitest';
import { TransactionTaskStatus, type TransactionTask } from '@/app/modules/transactionsThreading/types';
import { createApplyOptimisticTask } from '@/app/modules/transactionsThreading/transactionsThreadingStoreOptimistic';

function task(partial: Partial<TransactionTask> & Pick<TransactionTask, 'id'>): TransactionTask {
    return {
        transactionId: 'tx-1',
        title: 'خطوة',
        status: TransactionTaskStatus.Pending,
        parentTaskId: null,
        notes: null,
        deadline: null,
        officialReference: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        completedAt: null,
        ...partial,
    };
}

describe('createApplyOptimisticTask', () => {
    it('يطبق التحديث ثم يعيد السابق عند الفشل', async () => {
        const initial = task({ id: 't1' });
        let map: Record<string, TransactionTask[]> = { 'tx-1': [initial] };
        const sync = vi.fn();
        const apply = createApplyOptimisticTask({
            getTaskMap: () => map,
            patchTaskMap: (updater) => {
                map = updater(map);
            },
            syncThreadingToCalendar: sync,
        });

        await expect(
            apply(
                't1',
                (prev) => ({ ...prev, status: TransactionTaskStatus.Done }),
                async () => {
                    throw new Error('persist-failed');
                },
            ),
        ).rejects.toThrow('persist-failed');

        expect(map['tx-1']?.[0]?.status).toBe(TransactionTaskStatus.Pending);
        expect(sync).not.toHaveBeenCalled();
    });
});
