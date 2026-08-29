import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
    computeCalendarReminderFireAt,
    formatCalendarReminderLabel,
    formatCalendarReminderSnoozeLabel,
    resetCalendarReminderFiredKeysForTests,
    scanAndFireCalendarReminders,
} from '@/app/services/calendar/calendarEventReminder';
import { clearCalendarReminderFiredForTests } from '@/app/services/calendar/calendarReminderFiredStore';
import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';

const baseEvent = (partial: Partial<CalendarEvent> = {}): CalendarEvent => ({
    id: 'evt-1',
    userId: 'u1',
    title: 'جلسة',
    date: '2026-08-07',
    time: '10:00',
    type: 'custom',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
});

describe('calendarEventReminder', () => {
    beforeEach(() => {
        resetCalendarReminderFiredKeysForTests();
        clearCalendarReminderFiredForTests();
    });

    it('يحسب وقت التذكير قبل الموعد', () => {
        const fireAt = computeCalendarReminderFireAt('2026-08-07', '10:00', 10);
        expect(fireAt?.getHours()).toBe(9);
        expect(fireAt?.getMinutes()).toBe(50);
    });

    it('يعيد null بدون وقت أو تذكير', () => {
        expect(computeCalendarReminderFireAt('2026-08-07', '', 10)).toBeNull();
        expect(computeCalendarReminderFireAt('2026-08-07', '10:00', null)).toBeNull();
    });

    it('يُطلق التذكير مرة واحدة ضمن النافذة', () => {
        const fired: string[] = [];
        const now = new Date('2026-08-07T09:50:30');
        scanAndFireCalendarReminders(
            [baseEvent({ reminderMinutesBefore: 10 })],
            now,
            (event) => fired.push(event.id),
        );
        expect(fired).toEqual(['evt-1']);
        scanAndFireCalendarReminders(
            [baseEvent({ reminderMinutesBefore: 10 })],
            now,
            (event) => fired.push(event.id),
        );
        expect(fired).toEqual(['evt-1']);
    });

    it('يُنسّق تسمية التذكير', () => {
        expect(formatCalendarReminderLabel(10)).toBe('قبل 10 د');
        expect(formatCalendarReminderLabel(60)).toBe('قبل ساعة');
        expect(formatCalendarReminderSnoozeLabel(5)).toBe('5 دقائق');
        expect(formatCalendarReminderSnoozeLabel(15)).toBe('15 دقيقة');
        expect(formatCalendarReminderSnoozeLabel(30)).toBe('30 دقيقة');
    });
});
