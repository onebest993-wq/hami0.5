import { describe, expect, it } from 'vitest';
import type { LegalTask } from '@/app/types/TaskEngine';
import {
    countActiveFieldCurtainTasks,
    countFieldDaySheetTasks,
    listActiveFieldCurtainTasks,
    listFieldDaySheetTasks,
    sortFieldCurtainTasks,
} from '@/app/services/tasks/fieldCurtainTasks';

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
        fieldCurtainPinnedAt: partial.fieldCurtainPinnedAt ?? null,
        subTasks: partial.subTasks ?? [],
        documentRequirements: [],
        expenses: [],
    };
}

describe('fieldCurtainTasks', () => {
    it('lists only pinned incomplete tasks', () => {
        const tasks = [
            task({ id: '1', title: 'مثبت', pinnedToFieldCurtain: true }),
            task({ id: '2', title: 'منجز', pinnedToFieldCurtain: true, completedAt: new Date() }),
            task({ id: '3', title: 'عادي' }),
        ];
        expect(listActiveFieldCurtainTasks(tasks).map((t) => t.id)).toEqual(['1']);
        expect(countActiveFieldCurtainTasks(tasks)).toBe(1);
    });

    it('ignores fatal deadlines on curtain', () => {
        const tasks = [
            task({ id: '1', title: 'حتمي', pinnedToFieldCurtain: true, isFatalDeadline: true }),
        ];
        expect(countActiveFieldCurtainTasks(tasks)).toBe(0);
    });

    it('sorts by pin time then title', () => {
        const older = task({
            id: 'a',
            title: 'ب',
            pinnedToFieldCurtain: true,
            fieldCurtainPinnedAt: new Date('2026-01-01'),
        });
        const newer = task({
            id: 'b',
            title: 'أ',
            pinnedToFieldCurtain: true,
            fieldCurtainPinnedAt: new Date('2026-06-01'),
        });
        expect(sortFieldCurtainTasks([older, newer]).map((t) => t.id)).toEqual(['b', 'a']);
    });

    it('sheet list includes pinned and today-due (non-fatal) tasks', () => {
        const today = new Date('2026-06-21T10:00:00');
        const tasks = [
            task({
                id: '1',
                title: 'ميدانية اليوم بدون تثبيت',
                parsedDate: new Date('2026-06-21T09:00:00'),
            }),
            task({
                id: '2',
                title: 'مثبتة',
                pinnedToFieldCurtain: true,
                fieldCurtainPinnedAt: new Date('2026-06-21T08:00:00'),
            }),
            task({
                id: '3',
                title: 'حتمية غير مثبتة',
                isFatalDeadline: true,
                parsedDate: new Date('2026-06-21T09:00:00'),
            }),
        ];
        expect(listFieldDaySheetTasks(tasks, today).map((t) => t.id)).toEqual(['2', '1']);
        expect(countFieldDaySheetTasks(tasks, today)).toBe(2);
    });

    it('sheet list includes past-day tasks in current week (pinned or overdue)', () => {
        const today = new Date('2026-08-03T10:00:00');
        const tasks = [
            task({
                id: 'past-pinned',
                title: 'مثبتة يوم مضى',
                pinnedToFieldCurtain: true,
                fieldCurtainPinnedAt: new Date('2026-08-02T08:00:00'),
                parsedDate: new Date('2026-08-02T09:00:00'),
            }),
            task({
                id: 'past-due',
                title: 'مستحقة يوم مضى',
                parsedDate: new Date('2026-08-02T09:00:00'),
            }),
            task({
                id: 'future',
                title: 'لاحق',
                parsedDate: new Date('2026-08-05T09:00:00'),
            }),
        ];
        expect(listFieldDaySheetTasks(tasks, today).map((t) => t.id)).toEqual(['past-pinned', 'past-due']);
    });

    it('sheet list sorts pinned tasks by pin time', () => {
        const today = new Date('2026-06-21T10:00:00');
        const tasks = [
            task({
                id: 'older',
                title: 'أقدم',
                pinnedToFieldCurtain: true,
                fieldCurtainPinnedAt: new Date('2026-06-21T07:00:00'),
            }),
            task({
                id: 'newer',
                title: 'أحدث',
                pinnedToFieldCurtain: true,
                fieldCurtainPinnedAt: new Date('2026-06-21T09:00:00'),
            }),
        ];
        expect(listFieldDaySheetTasks(tasks, today).map((t) => t.id)).toEqual(['newer', 'older']);
    });
});
