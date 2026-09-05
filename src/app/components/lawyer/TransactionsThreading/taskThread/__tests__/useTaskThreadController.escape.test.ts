import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTaskThreadController } from '../useTaskThreadController';

vi.mock('@/app/modules/transactionsThreading/store', () => ({
    useTransactionsThreadingStore: (selector: (state: Record<string, unknown>) => unknown) =>
        selector({
            updateTaskStatus: vi.fn(),
            completeTask: vi.fn(),
            updateTask: vi.fn(),
            deleteTaskCascade: vi.fn(),
            tasksByTransactionId: {},
        }),
}));

describe('useTaskThreadController escape snapshot', () => {
    it('يفرغ لقطة مهام المسار عند الإزالة', () => {
        const onTaskEscapeSnapshotChange = vi.fn();
        const { unmount } = renderHook(() =>
            useTaskThreadController({
                transactionId: 'tx-1',
                onRequestAddTask: vi.fn(),
                onTaskEscapeSnapshotChange,
            }),
        );

        unmount();
        expect(onTaskEscapeSnapshotChange).toHaveBeenLastCalledWith({
            taskCompleteOpen: false,
            taskEditOpen: false,
            taskDeleteOpen: false,
        });
    });
});
