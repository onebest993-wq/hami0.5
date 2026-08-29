import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
    countFieldDaySheetTasksLite,
    isEligibleFieldDaySheetTaskLite,
} from '@/app/services/tasks/fieldCurtainDayCountLite';
import {
    countFieldDaySheetTasks,
    listFieldDaySheetTasks,
} from '@/app/services/tasks/fieldCurtainTasks';
import { legalTaskStub as task } from './legalTaskStub';

describe('fieldCurtainDayCountLite', () => {
    it('does not import calendar authenticity or field-task alerts', () => {
        const here = dirname(fileURLToPath(import.meta.url));
        const src = readFileSync(join(here, '../fieldCurtainDayCountLite.ts'), 'utf8');
        expect(src).not.toMatch(/from ['"]@\/app\/services\/calendarAuthenticity['"]/);
        expect(src).not.toMatch(/from ['"]@\/app\/services\/fieldTaskAlerts['"]/);
        expect(src).not.toMatch(/from ['"]@\/app\/services\/calendar\//);
        expect(src).not.toMatch(/from ['"]@\/app\/components\/lawyer\/dashboard\/tasksManager\/utils['"]/);
    });

    it('excludes future-this-week tasks and includes due-on-or-before-today in week', () => {
        const now = new Date('2026-08-03T10:00:00');
        const future = task({
            id: 'future',
            title: 'لاحق',
            parsedDate: new Date('2026-08-05T09:00:00'),
        });
        const dueToday = task({
            id: 'today',
            title: 'اليوم',
            parsedDate: new Date('2026-08-03T09:00:00'),
        });
        const overdue = task({
            id: 'overdue',
            title: 'متأخر',
            parsedDate: new Date('2026-08-02T09:00:00'),
        });
        expect(isEligibleFieldDaySheetTaskLite(future, now)).toBe(false);
        expect(isEligibleFieldDaySheetTaskLite(dueToday, now)).toBe(true);
        expect(isEligibleFieldDaySheetTaskLite(overdue, now)).toBe(true);
    });

    it('lite count equals sorted list length', () => {
        const now = new Date('2026-08-03T10:00:00');
        const tasks = [
            task({ id: 'a', title: 'أ', parsedDate: new Date('2026-08-03T09:00:00') }),
            task({ id: 'b', title: 'ب', parsedDate: new Date('2026-08-05T09:00:00') }),
            task({ id: 'c', title: 'ج', pinnedToFieldCurtain: true }),
        ];
        expect(countFieldDaySheetTasksLite(tasks, now)).toBe(listFieldDaySheetTasks(tasks, now).length);
        expect(countFieldDaySheetTasks(tasks, now)).toBe(countFieldDaySheetTasksLite(tasks, now));
    });
});
