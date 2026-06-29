import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
    dedupeCalendarGetEvents,
    getCachedCalendarEvents,
    invalidateCalendarEventsCache,
    resetCalendarEventsCacheForTests,
    setCachedCalendarEvents,
} from '@/app/services/calendar/calendarEventsCache';
import type { CalendarEvent } from '@/app/services/lawyer-cloud';

const USER = 'lawyer-cache-1';

const sampleEvent = (id: string): CalendarEvent => ({
    id,
    userId: USER,
    title: 'موعد',
    date: '2026-06-01',
    type: 'custom',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('calendarEventsCache', () => {
    beforeEach(() => {
        resetCalendarEventsCacheForTests();
    });

    it('يُرجع cache من الذاكرة دون إعادة fetch', async () => {
        setCachedCalendarEvents(USER, [sampleEvent('a')]);
        const fetcher = vi.fn(async () => [sampleEvent('b')]);

        const first = await dedupeCalendarGetEvents(USER, fetcher);
        const second = await dedupeCalendarGetEvents(USER, fetcher);

        expect(first[0]?.id).toBe('a');
        expect(second[0]?.id).toBe('a');
        expect(fetcher).not.toHaveBeenCalled();
    });

    it('forceRefresh يُبطل cache ويعيد fetch', async () => {
        setCachedCalendarEvents(USER, [sampleEvent('a')]);
        const fetcher = vi.fn(async () => [sampleEvent('b')]);

        const result = await dedupeCalendarGetEvents(USER, fetcher, { forceRefresh: true });

        expect(result[0]?.id).toBe('b');
        expect(getCachedCalendarEvents(USER)?.[0]?.id).toBe('b');
    });

    it('يُجمّع طلبات getEvents المتزامنة', async () => {
        let resolve!: (v: CalendarEvent[]) => void;
        const fetcher = vi.fn(
            () =>
                new Promise<CalendarEvent[]>((r) => {
                    resolve = r;
                }),
        );

        const p1 = dedupeCalendarGetEvents(USER, fetcher);
        const p2 = dedupeCalendarGetEvents(USER, fetcher);
        resolve([sampleEvent('x')]);

        const [a, b] = await Promise.all([p1, p2]);
        expect(a).toEqual(b);
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('invalidateCalendarEventsCache يمسح الذاكرة', () => {
        setCachedCalendarEvents(USER, [sampleEvent('a')]);
        invalidateCalendarEventsCache(USER);
        expect(getCachedCalendarEvents(USER)).toBeNull();
    });
});
