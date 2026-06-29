import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LegalTask } from '@/app/types/TaskEngine';
import {
    getPendingFieldTasksCountSnapshot,
    getQuantumPendingSnapshot,
    getQuantumTasksFingerprint,
    publishQuantumTasksMetrics,
    subscribePendingFieldTasksCount,
    subscribeQuantumTasksFingerprint,
} from '../quantumTasksMetrics';

function task(partial: Partial<LegalTask> & Pick<LegalTask, 'id' | 'title'>): LegalTask {
    return {
        id: partial.id,
        rawText: partial.title,
        title: partial.title,
        location: partial.location ?? null,
        parsedDate: partial.parsedDate ?? null,
        reminderAt: null,
        isFatalDeadline: partial.isFatalDeadline ?? false,
        linkedCaseId: null,
        status: partial.status ?? 'pending',
        completedAt: partial.completedAt ?? null,
        pinnedToFieldCurtain: partial.pinnedToFieldCurtain ?? false,
        subTasks: partial.subTasks ?? [],
        documentRequirements: [],
        expenses: [],
    };
}

describe('quantumTasksMetrics', () => {
    afterEach(() => {
        publishQuantumTasksMetrics([], []);
    });

    it('publishes snapshots readable via getters', () => {
        const pending = [task({ id: 'a', title: 'مهمة' })];
        publishQuantumTasksMetrics(pending, pending);
        expect(getQuantumPendingSnapshot()).toEqual(pending);
        expect(getQuantumTasksFingerprint().length).toBeGreaterThan(0);
    });

    it('notifies count listeners only when field-day count changes', () => {
        const listener = vi.fn();
        const unsub = subscribePendingFieldTasksCount(listener);
        publishQuantumTasksMetrics([], []);
        listener.mockClear();

        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const pinned = task({ id: 'p', title: 'ميدان', pinnedToFieldCurtain: true, parsedDate: today });
        publishQuantumTasksMetrics([pinned], [pinned]);
        expect(listener).toHaveBeenCalledTimes(1);
        expect(getPendingFieldTasksCountSnapshot()).toBe(1);

        publishQuantumTasksMetrics([pinned], [pinned]);
        expect(listener).toHaveBeenCalledTimes(1);

        unsub();
    });

    it('notifies fingerprint listeners when subtask completion changes', () => {
        const fpListener = vi.fn();
        const unsub = subscribeQuantumTasksFingerprint(fpListener);
        const base = task({
            id: 's',
            title: 'فرعية',
            subTasks: [{ id: 'st1', title: 'إجراء', location: null, isCompleted: false }],
        });
        publishQuantumTasksMetrics([base], [base]);
        fpListener.mockClear();

        const updated = {
            ...base,
            subTasks: [{ id: 'st1', title: 'إجراء', location: null, isCompleted: true }],
        };
        publishQuantumTasksMetrics([updated], [updated]);
        expect(fpListener).toHaveBeenCalledTimes(1);
        expect(getQuantumTasksFingerprint()).not.toBe('');

        unsub();
    });
});
