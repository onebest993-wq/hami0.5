import { describe, expect, it, beforeEach } from 'vitest';
import {
    isBridgedCalendarEvent,
    propagateBridgedCalendarUpdate,
} from '../calendarBridgePersistence';
import type { CalendarEvent } from '@/app/services/lawyer-cloud';
import { saveLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';

describe('calendarBridgePersistence', () => {
    beforeEach(() => {
        saveLawsuitFilesRaw([]);
    });

    it('isBridgedCalendarEvent detects module-linked events', () => {
        const manual: CalendarEvent = {
            id: '1',
            userId: 'u',
            title: 'x',
            date: '2026-03-01',
            type: 'custom',
            createdAt: '',
            updatedAt: '',
            sourceModule: 'manual',
            sourceEntityId: 'a',
            sourceEventId: 'b',
        };
        const lawsuit: CalendarEvent = {
            ...manual,
            sourceModule: 'lawsuit',
        };
        expect(isBridgedCalendarEvent(manual)).toBe(false);
        expect(isBridgedCalendarEvent(lawsuit)).toBe(true);
    });

    it('propagateBridgedCalendarUpdate patches lawsuit task due date in storage', async () => {
        saveLawsuitFilesRaw([
            {
                id: 42,
                caseNo: '1/2026',
                stages: [
                    {
                        id: 's1',
                        name: 'أولى',
                        status: 'active',
                        tasks: [{ id: 't1', title: 'مهمة قديمة', dueDate: '2026-01-01', isCompleted: false }],
                    },
                ],
            },
        ]);

        const event: CalendarEvent = {
            id: 'hami_bridge_lawsuit_42_task_t1',
            userId: 'dev-user-uuid-1',
            title: 'مهمة: مهمة محدثة',
            date: '2026-05-20',
            type: 'deadline',
            createdAt: '',
            updatedAt: '',
            sourceModule: 'lawsuit',
            sourceEntityId: '42',
            sourceEventId: 'task_t1',
        };

        const ok = await propagateBridgedCalendarUpdate(event);
        expect(ok).toBe(true);

        const { loadLawsuitFilesRaw } = await import('@/app/utils/lawsuitFilesStorage');
        const files = loadLawsuitFilesRaw() as Array<{
            stages?: Array<{ tasks?: Array<{ dueDate?: string; title?: string }> }>;
        }>;
        const task = files[0]?.stages?.[0]?.tasks?.[0];
        expect(task?.dueDate).toBe('2026-05-20');
        expect(task?.title).toBe('مهمة محدثة');
    });
});
