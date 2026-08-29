import { describe, expect, it } from 'vitest';
import { startOfLocalDay } from '@/app/utils/nlpParser';
import { MAX_TASK_RAW_LENGTH } from '@/app/services/tasks/taskInputGuard';
import {
    buildPendingTaskFromRaw,
    buildSnoozedBacklogTask,
    buildWeeklyLocationBundleTask,
} from '@/app/services/tasks/quantumTaskCreateBuilders';

describe('quantumTaskCreateBuilders', () => {
    it('buildPendingTaskFromRaw rejects empty or oversized input', () => {
        expect(buildPendingTaskFromRaw('')).toBeNull();
        expect(buildPendingTaskFromRaw('  ')).toBeNull();
        expect(buildPendingTaskFromRaw('x'.repeat(MAX_TASK_RAW_LENGTH + 1))).toBeNull();
    });

    it('buildPendingTaskFromRaw returns a pending task with empty nested collections', () => {
        const task = buildPendingTaskFromRaw('جلسة محكمة كرخ غداً');
        expect(task).not.toBeNull();
        expect(task!.status).toBe('pending');
        expect(task!.completedAt).toBeNull();
        expect(task!.subTasks).toEqual([]);
        expect(task!.reminderAt).toBeNull();
        expect(task!.rawText.length).toBeGreaterThan(0);
    });

    it('buildWeeklyLocationBundleTask with details string has no field subtasks', () => {
        const day = startOfLocalDay(new Date(2026, 4, 18));
        const task = buildWeeklyLocationBundleTask(day, 'محكمة الرصافة', 'متابعة قرار');
        expect(task).not.toBeNull();
        expect(task!.location).toBe('محكمة الرصافة');
        expect(task!.title).toBe('متابعة قرار');
        expect(task!.subTasks).toHaveLength(0);
        expect(task!.parsedDate?.getTime()).toBe(day.getTime());
    });

    it('buildWeeklyLocationBundleTask with actions uses leftover titles as field subtasks', () => {
        const day = startOfLocalDay(new Date(2026, 4, 18));
        const task = buildWeeklyLocationBundleTask(day, 'محكمة الرصافة', ['دفع رسم', 'تصوير قرار']);
        expect(task).not.toBeNull();
        expect(task!.title).toBe('دفع رسم');
        expect(task!.subTasks).toHaveLength(1);
        expect(task!.subTasks[0]!.title).toBe('تصوير قرار');
        expect(task!.subTasks[0]!.kind).toBe('field');
        expect(task!.subTasks[0]!.isCompleted).toBe(false);
    });

    it('buildWeeklyLocationBundleTask rejects missing location', () => {
        expect(buildWeeklyLocationBundleTask(new Date(), '  ', 'جلسة')).toBeNull();
    });

    it('buildSnoozedBacklogTask stores reminder and leaves parsedDate empty', () => {
        const when = startOfLocalDay(new Date(2026, 6, 4));
        const task = buildSnoozedBacklogTask('مراجعة إضبارة', when, 'بغداد');
        expect(task).not.toBeNull();
        expect(task!.title).toBe('مراجعة إضبارة');
        expect(task!.location).toBe('بغداد');
        expect(task!.parsedDate).toBeNull();
        expect(task!.reminderAt?.getTime()).toBe(when.getTime());
        expect(task!.status).toBe('pending');
    });
});
