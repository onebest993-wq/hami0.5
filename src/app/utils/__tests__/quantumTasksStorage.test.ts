import { describe, expect, it, beforeEach } from 'vitest';
import type { LegalTask } from '@/app/types/TaskEngine';
import {
    countPendingFieldTasks,
    deserializeQuantumTasks,
    persistQuantumTasksSync,
    readQuantumTasksFromDiskSync,
    serializeQuantumTasks,
    QUANTUM_TASKS_STORAGE_KEY,
} from '../quantumTasksStorage';

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

describe('deserializeQuantumTasks', () => {
    it('returns empty array for invalid blob', () => {
        expect(deserializeQuantumTasks(null)).toEqual([]);
        expect(deserializeQuantumTasks({})).toEqual([]);
        expect(deserializeQuantumTasks({ tasks: 'x' })).toEqual([]);
    });

    it('normalizes unknown status to pending and parses ISO dates', () => {
        const loaded = deserializeQuantumTasks({
            tasks: [
                {
                    id: 't1',
                    rawText: 'نص',
                    title: 'مهمة',
                    status: 'bogus',
                    parsedDate: '2026-05-10T00:00:00.000Z',
                    reminderAt: '2026-06-01T00:00:00.000Z',
                    subTasks: [{ id: 's1', title: 'فرع', location: 'بغداد', isCompleted: false }],
                    expenses: [{ id: 'e1', amount: 5000, label: 'رسم' }],
                },
            ],
        });
        expect(loaded).toHaveLength(1);
        expect(loaded[0]!.status).toBe('pending');
        expect(loaded[0]!.parsedDate).toBeInstanceOf(Date);
        expect(loaded[0]!.reminderAt).toBeInstanceOf(Date);
        expect(loaded[0]!.subTasks).toHaveLength(1);
        expect(loaded[0]!.expenses[0]!.amount).toBe(5000);
    });

    it('filters tasks without id', () => {
        const loaded = deserializeQuantumTasks({ tasks: [{ id: '', title: 'x' }] });
        expect(loaded).toHaveLength(0);
    });
});

describe('serializeQuantumTasks / deserializeQuantumTasks roundtrip', () => {
    it('preserves task fields through ISO serialization', () => {
        const original = [
            task({
                id: 'a1',
                title: 'جلسة',
                location: 'كرخ',
                parsedDate: new Date(2026, 4, 10),
                pinnedToFieldCurtain: true,
            }),
        ];
        const blob = serializeQuantumTasks(original);
        const restored = deserializeQuantumTasks(blob);
        expect(restored).toHaveLength(1);
        expect(restored[0]!.id).toBe('a1');
        expect(restored[0]!.location).toBe('كرخ');
        expect(restored[0]!.pinnedToFieldCurtain).toBe(true);
        expect(restored[0]!.parsedDate?.toISOString()).toBe(original[0]!.parsedDate?.toISOString());
    });
});

describe('countPendingFieldTasks', () => {
    it('counts field-day sheet tasks for dock badge', () => {
        const pending = [
            task({ id: '1', title: 'مثبت', pinnedToFieldCurtain: true }),
            task({ id: '2', title: 'موقع', location: '  بغداد  ' }),
            task({
                id: '3',
                title: 'فرع',
                subTasks: [{ id: 's1', title: 'خطوة', location: 'رصافة', isCompleted: false }],
            }),
        ];
        expect(countPendingFieldTasks(pending)).toBe(1);
    });

    it('excludes completed pinned tasks from badge count', () => {
        const pending = [
            task({ id: '1', title: 'مثبت', pinnedToFieldCurtain: true }),
            task({
                id: '2',
                title: 'منجز',
                pinnedToFieldCurtain: true,
                completedAt: new Date(),
            }),
        ];
        expect(countPendingFieldTasks(pending)).toBe(1);
    });

    it('ignores unpinned tasks even with locations', () => {
        const pending = [
            task({ id: '1', title: 'فرع منجز', subTasks: [{ id: 's1', title: 'x', location: 'بابل', isCompleted: true }] }),
            task({ id: '2', title: 'فراغ', location: '   ' }),
            task({ id: '3', title: 'بدون', location: null }),
        ];
        expect(countPendingFieldTasks(pending)).toBe(0);
    });
});

describe('persistQuantumTasksSync / readQuantumTasksFromDiskSync', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('writes synchronously to localStorage and survives reload read', () => {
        const tasks = [
            task({
                id: 'persist-1',
                title: 'مهمة أسبوعية',
                location: 'بغداد',
                parsedDate: new Date(2026, 5, 21),
            }),
        ];
        expect(persistQuantumTasksSync(tasks)).toBe(true);
        const raw = localStorage.getItem(QUANTUM_TASKS_STORAGE_KEY);
        expect(raw).toContain('persist-1');
        expect(raw).toContain('بغداد');

        const restored = readQuantumTasksFromDiskSync(new Date(2026, 5, 21));
        expect(restored).toHaveLength(1);
        expect(restored[0]!.id).toBe('persist-1');
        expect(restored[0]!.location).toBe('بغداد');
    });
});
