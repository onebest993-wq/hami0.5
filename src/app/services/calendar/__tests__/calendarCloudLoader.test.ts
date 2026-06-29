import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    fetchCalendarEvents,
    prefetchCalendarCloudModule,
    resetCalendarCloudLoaderForTests,
} from '@/app/services/calendar/calendarCloudLoader';

vi.mock('@/app/services/cloud/lawyerCalendarCloud', () => ({
    CalendarDB: {
        getEvents: vi.fn().mockResolvedValue([{ id: 'cal-1', title: 'جلسة' }]),
    },
}));

describe('calendarCloudLoader', () => {
    beforeEach(() => {
        resetCalendarCloudLoaderForTests();
        vi.clearAllMocks();
    });

    it('fetchCalendarEvents يُفوّض إلى CalendarDB', async () => {
        const events = await fetchCalendarEvents('user-1');
        expect(events[0]?.id).toBe('cal-1');
    });

    it('prefetchCalendarCloudModule لا يرمي', () => {
        expect(() => prefetchCalendarCloudModule()).not.toThrow();
    });
});
