import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '@/app/services/lawyer-cloud';
import { buildStableBridgeId } from '@/app/services/calendarBridge';
import { mergeTimelineEventsWithCalendar } from '@/app/utils/calendarTimelineMerge';

describe('mergeTimelineEventsWithCalendar', () => {
    it('يستبدل تاريخ موعد السجل بتاريخ التقويم', () => {
        const execId = 'exec-1';
        const apptId = 'appt-1';
        const cal: CalendarEvent = {
            id: buildStableBridgeId('execution', execId, apptId),
            userId: 'u1',
            title: 'جلسة من التقويم',
            date: '2028-06-15',
            time: '10:30',
            type: 'execution',
            sourceModule: 'execution',
            sourceEntityId: execId,
            sourceEventId: apptId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const merged = mergeTimelineEventsWithCalendar(
            [
                {
                    id: apptId,
                    type: 'appointment',
                    date: '2028-01-01',
                    title: 'قديم',
                } as never,
            ],
            [cal],
            'execution',
            execId,
        );
        expect(merged[0].date).toBe('2028-06-15');
        expect(merged[0].title).toBe('جلسة من التقويم');
    });
});
