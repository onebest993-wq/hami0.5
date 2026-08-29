import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
    fetchCalendarEvents,
    prefetchCalendarCloudModule,
    resetCalendarCloudLoaderForTests,
    saveCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
} from '@/app/services/calendar/calendarCloudLoader';
import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';

const db = vi.hoisted(() => ({
    getEvents: vi.fn().mockResolvedValue([{ id: 'cal-1', title: 'جلسة' }]),
    saveEvent: vi.fn().mockResolvedValue(undefined),
    updateEvent: vi.fn().mockResolvedValue(undefined),
    deleteEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/app/services/cloud/lawyerCalendarCloud', () => ({
    CalendarDB: {
        getEvents: db.getEvents,
        saveEvent: db.saveEvent,
        updateEvent: db.updateEvent,
        deleteEvent: db.deleteEvent,
    },
}));

const SAMPLE: CalendarEvent = {
    id: 'cal-1',
    userId: 'user-1',
    title: 'جلسة',
    date: '2026-08-22',
    type: 'custom',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('calendarCloudLoader', () => {
    beforeEach(() => {
        resetCalendarCloudLoaderForTests();
        vi.clearAllMocks();
        db.getEvents.mockResolvedValue([{ id: 'cal-1', title: 'جلسة' }]);
        db.saveEvent.mockResolvedValue(undefined);
        db.updateEvent.mockResolvedValue(undefined);
        db.deleteEvent.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('fetchCalendarEvents يُفوّض إلى CalendarDB', async () => {
        const events = await fetchCalendarEvents('user-1');
        expect(events[0]?.id).toBe('cal-1');
    });

    it('prefetchCalendarCloudModule لا يرمي', () => {
        expect(() => prefetchCalendarCloudModule()).not.toThrow();
    });

    it('يحفظ ويحدّث ويحذف عبر CalendarDB', async () => {
        await saveCalendarEvent(SAMPLE);
        await updateCalendarEvent(SAMPLE);
        await deleteCalendarEvent('cal-1', 'user-1');
        expect(db.saveEvent).toHaveBeenCalledWith(SAMPLE);
        expect(db.updateEvent).toHaveBeenCalledWith(SAMPLE);
        expect(db.deleteEvent).toHaveBeenCalledWith('cal-1', 'user-1');
    });

    it('يفشل التحديث المعلّق بعد مهلة الحفظ', async () => {
        vi.useFakeTimers();
        db.updateEvent.mockImplementation(() => new Promise(() => {}));
        const pending = updateCalendarEvent(SAMPLE);
        const assertion = expect(pending).rejects.toThrow('calendar-save-timeout');
        await vi.advanceTimersByTimeAsync(8_000);
        await assertion;
    });
});
