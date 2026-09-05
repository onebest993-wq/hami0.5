import { describe, expect, it } from 'vitest';
import {
    listFieldDaySheetTasks,
    sortFieldCurtainTasks,
} from '@/app/services/tasks/fieldCurtainTasks';
import { legalTaskStub as task } from './legalTaskStub';

describe('fieldCurtainTasks', () => {
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

    it('sheet list includes pinned, today-due, and today fatal tasks', () => {
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
                title: 'حتمية اليوم',
                isFatalDeadline: true,
                parsedDate: new Date('2026-06-21T09:00:00'),
            }),
        ];
        expect(listFieldDaySheetTasks(tasks, today).map((t) => t.id)).toEqual(['3', '2', '1']);
    });

    it('sheet list excludes future fatal deadlines', () => {
        const today = new Date('2026-06-21T10:00:00');
        const tasks = [
            task({
                id: 'future-fatal',
                title: 'حتمية لاحقة',
                isFatalDeadline: true,
                parsedDate: new Date('2026-08-01T09:00:00'),
            }),
        ];
        expect(listFieldDaySheetTasks(tasks, today)).toHaveLength(0);
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

    it('sheet count matches list length without depending on sort', () => {
        const today = new Date('2026-08-03T10:00:00');
        const tasks = [
            task({
                id: 'today',
                title: 'اليوم',
                parsedDate: new Date('2026-08-03T09:00:00'),
            }),
            task({
                id: 'future-week',
                title: 'لاحق هذا الأسبوع',
                parsedDate: new Date('2026-08-05T09:00:00'),
            }),
            task({
                id: 'pinned',
                title: 'مثبتة',
                pinnedToFieldCurtain: true,
            }),
        ];
        const listed = listFieldDaySheetTasks(tasks, today);
        expect(listed.map((t) => t.id).sort()).toEqual(['pinned', 'today']);
    });

    it('includes this-week task when reminder is today even if parsedDate is later this week', () => {
        const today = new Date('2026-08-03T10:00:00');
        const tasks = [
            task({
                id: 'remind-today',
                title: 'تذكير اليوم',
                parsedDate: new Date('2026-08-05T09:00:00'),
                reminderAt: new Date('2026-08-03T08:00:00'),
            }),
        ];
        expect(listFieldDaySheetTasks(tasks, today).map((t) => t.id)).toEqual(['remind-today']);
    });

    it('treats local midnight parsedDate as today, not UTC ISO day', () => {
        const today = new Date(2026, 7, 3, 10, 0, 0);
        const localMidnight = new Date(2026, 7, 3, 0, 0, 0);
        const tasks = [
            task({
                id: 'local-today',
                title: 'منتصف الليل المحلي',
                parsedDate: localMidnight,
            }),
        ];
        expect(listFieldDaySheetTasks(tasks, today)).toHaveLength(1);
    });
});
