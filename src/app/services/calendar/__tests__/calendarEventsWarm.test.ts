import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    primeCalendarEventsCacheFromPeek,
    registerScheduleWarmUserId,
} from '@/app/services/calendar/calendarEventsWarm';
import {
    getCachedCalendarEvents,
    hasCachedCalendarEvents,
    resetCalendarEventsCacheForTests,
    setCachedCalendarEvents,
} from '@/app/services/calendar/calendarEventsCache';
import { peekLocalCalendarSnapshotSync } from '@/app/services/calendar/calendarLocalSnapshot';
import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';

vi.mock('@/app/services/calendar/calendarLocalSnapshot', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/calendar/calendarLocalSnapshot')>();
    return {
        ...actual,
        peekLocalCalendarSnapshotSync: vi.fn(actual.peekLocalCalendarSnapshotSync),
        readLocalCalendarSnapshotSync: vi.fn(actual.readLocalCalendarSnapshotSync),
    };
});

vi.mock('@/app/services/calendar/calendarCloudRuntime', () => ({
    fetchCalendarEvents: vi.fn(async () => []),
}));

const USER = 'lawyer-warm-1';

const event: CalendarEvent = {
    id: 'ev-1',
    userId: USER,
    title: 'جلسة',
    date: '2026-08-30',
    type: 'custom',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('primeCalendarEventsCacheFromPeek', () => {
    beforeEach(() => {
        resetCalendarEventsCacheForTests();
        vi.mocked(peekLocalCalendarSnapshotSync).mockReset();
        vi.mocked(peekLocalCalendarSnapshotSync).mockReturnValue([]);
        registerScheduleWarmUserId(null);
    });

    it('يملأ الكاش من peek ولا يكتب فارغاً', () => {
        vi.mocked(peekLocalCalendarSnapshotSync).mockReturnValue([event]);
        expect(primeCalendarEventsCacheFromPeek(USER)).toBe(true);
        expect(getCachedCalendarEvents(USER)?.[0]?.id).toBe('ev-1');

        vi.mocked(peekLocalCalendarSnapshotSync).mockReturnValue([]);
        expect(primeCalendarEventsCacheFromPeek(USER)).toBe(true);
        expect(peekLocalCalendarSnapshotSync).toHaveBeenCalledTimes(1);
    });

    it('لا يحجب الجلب إن كانت اللقطة فارغة', () => {
        vi.mocked(peekLocalCalendarSnapshotSync).mockReturnValue([]);
        expect(primeCalendarEventsCacheFromPeek(USER)).toBe(false);
        expect(hasCachedCalendarEvents(USER)).toBe(false);
    });

    it('يحترم كاشاً موجوداً', () => {
        setCachedCalendarEvents(USER, [event]);
        vi.mocked(peekLocalCalendarSnapshotSync).mockReturnValue([]);
        expect(primeCalendarEventsCacheFromPeek(USER)).toBe(true);
        expect(peekLocalCalendarSnapshotSync).not.toHaveBeenCalled();
    });

    it('كاش فارغ لا يحجب leftover على القرص', () => {
        setCachedCalendarEvents(USER, []);
        vi.mocked(peekLocalCalendarSnapshotSync).mockReturnValue([event]);
        expect(primeCalendarEventsCacheFromPeek(USER)).toBe(true);
        expect(getCachedCalendarEvents(USER)?.[0]?.id).toBe('ev-1');
    });
});
