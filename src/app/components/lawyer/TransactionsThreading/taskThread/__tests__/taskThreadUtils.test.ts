import { describe, expect, it } from 'vitest';
import { TransactionTaskStatus, type TransactionTask } from '@/app/modules/transactionsThreading/types';
import {
    computeTaskProgress,
    countTaskCascade,
    nextTaskStatus,
    STATUS_CYCLE,
} from '@/app/components/lawyer/TransactionsThreading/taskThread/taskThreadUtils';

function task(id: string, parentTaskId: string | null = null): TransactionTask {
    return {
        id,
        transactionId: 'tx-1',
        title: `task-${id}`,
        status: TransactionTaskStatus.Pending,
        parentTaskId,
        notes: null,
        deadline: null,
        officialReference: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        completedAt: null,
    };
}

describe('taskThreadUtils', () => {
    it('nextTaskStatus يدور عبر STATUS_CYCLE ويتخطى المعطّل عند النقر', () => {
        expect(nextTaskStatus(TransactionTaskStatus.Pending)).toBe(TransactionTaskStatus.InProgress);
        expect(nextTaskStatus(TransactionTaskStatus.InProgress)).toBe(TransactionTaskStatus.Done);
        expect(nextTaskStatus(TransactionTaskStatus.Blocked)).toBe(TransactionTaskStatus.Done);
        expect(nextTaskStatus(TransactionTaskStatus.Done)).toBe(STATUS_CYCLE[0]);
    });

    it('countTaskCascade يحسب المهام المتفرعة', () => {
        const tasks = [task('a'), task('b', 'a'), task('c', 'b'), task('d')];
        expect(countTaskCascade('a', tasks)).toBe(3);
        expect(countTaskCascade('d', tasks)).toBe(1);
    });

    it('computeTaskProgress يحسب النسبة', () => {
        const tasks = [
            { ...task('1'), status: TransactionTaskStatus.Done },
            { ...task('2'), status: TransactionTaskStatus.Pending },
        ];
        expect(computeTaskProgress(tasks)).toEqual({ total: 2, done: 1, percent: 50 });
        expect(computeTaskProgress([])).toEqual({ total: 0, done: 0, percent: 0 });
    });
});
