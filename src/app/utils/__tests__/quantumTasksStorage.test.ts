import { describe, expect, it, beforeEach } from 'vitest';
import { legalTaskStub as task } from '@/app/services/tasks/__tests__/legalTaskStub';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    countPendingFieldTasks,
    deserializeQuantumTasks,
    persistQuantumTasksSync,
    readQuantumTasksFromDiskSync,
    serializeQuantumTasks,
    QUANTUM_TASKS_STORAGE_KEY,
} from '../quantumTasksStorage';

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

    it('clamps oversized strings and drops unsafe voice refs', () => {
        const loaded = deserializeQuantumTasks({
            tasks: [
                {
                    id: 'bomb-1',
                    rawText: 'x'.repeat(5000),
                    title: 'y'.repeat(5000),
                    status: 'pending',
                    voiceRef: 'javascript:alert(1)',
                    voiceTranscript: 'z'.repeat(9000),
                    subTasks: Array.from({ length: 90 }, (_, i) => ({
                        id: `s${i}`,
                        title: 'فرع',
                        isCompleted: false,
                    })),
                },
            ],
        });
        expect(loaded).toHaveLength(1);
        expect(loaded[0]!.rawText.length).toBeLessThanOrEqual(2000);
        expect(loaded[0]!.title.length).toBeLessThanOrEqual(500);
        expect(loaded[0]!.voiceRef).toBeNull();
        expect(loaded[0]!.voiceTranscript!.length).toBeLessThanOrEqual(4000);
        expect(loaded[0]!.subTasks.length).toBeLessThanOrEqual(40);
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
        try {
            SecureStoreService.deleteItemSync(QUANTUM_TASKS_STORAGE_KEY);
        } catch {
            /* ignore */
        }
    });

    it('writes SecureStore synchronously and clears leftover localStorage', () => {
        const tasks = [
            task({
                id: 'persist-1',
                title: 'مهمة أسبوعية',
                location: 'بغداد',
                parsedDate: new Date(2026, 5, 21),
            }),
        ];
        expect(persistQuantumTasksSync(tasks)).toBe(true);
        expect(localStorage.getItem(QUANTUM_TASKS_STORAGE_KEY)).toBeNull();
        const raw = SecureStoreService.getItemSync(QUANTUM_TASKS_STORAGE_KEY);
        expect(raw).toContain('persist-1');
        expect(raw).toContain('بغداد');
    });

    it('قراءة الستارة المتزامنة تقرأ leftover localStorage دون محوه (أول إطار)', () => {
        const blob = serializeQuantumTasks([
            task({
                id: 'legacy-1',
                title: 'تراثي',
                location: 'كرخ',
                parsedDate: new Date(2026, 5, 21),
            }),
        ]);
        localStorage.setItem(QUANTUM_TASKS_STORAGE_KEY, JSON.stringify(blob));
        const restored = readQuantumTasksFromDiskSync(new Date(2026, 5, 21));
        expect(restored).toHaveLength(1);
        expect(restored[0]!.id).toBe('legacy-1');
        expect(restored[0]!.location).toBe('كرخ');
        expect(localStorage.getItem(QUANTUM_TASKS_STORAGE_KEY)).not.toBeNull();
    });
});
