import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalendarEventReminders } from '@/app/components/lawyer/SmartLegalRadar/hooks/useCalendarEventReminders';
import {
    resetCalendarReminderFiredKeysForTests,
} from '@/app/services/calendar/calendarEventReminder';
import { clearCalendarReminderFiredForTests } from '@/app/services/calendar/calendarReminderFiredStore';
import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';

vi.mock('@/app/services/notifications/HamiNotificationBridge', () => ({
    showHamiNotification: vi.fn(async () => undefined),
}));

vi.mock('@/app/services/notifications/notificationAlertPolicy', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/notifications/notificationAlertPolicy')>();
    return {
        ...actual,
        shouldFireCalendarAlarm: () => true,
        shouldPlayCalendarAlarmSound: () => true,
    };
});

const event: CalendarEvent = {
    id: 'evt-rem',
    userId: 'u1',
    title: 'جلسة تحقيق',
    date: '2026-08-07',
    time: '10:00',
    type: 'custom',
    reminderMinutesBefore: 10,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('useCalendarEventReminders', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        resetCalendarReminderFiredKeysForTests();
        clearCalendarReminderFiredForTests();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('يفعّل المنبه عند حلول وقت التذكير', () => {
        vi.setSystemTime(new Date('2026-08-07T09:50:10'));

        const { result } = renderHook(() => useCalendarEventReminders([event], true));

        act(() => {
            vi.advanceTimersByTime(1);
        });

        expect(result.current.activeAlarm?.event.id).toBe('evt-rem');
        expect(result.current.activeAlarm?.reminderMinutesBefore).toBe(10);
    });

    it('يؤجّل المنبه عند الطلب', () => {
        vi.setSystemTime(new Date('2026-08-07T09:50:10'));

        const { result } = renderHook(() => useCalendarEventReminders([event], true));

        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(result.current.activeAlarm).not.toBeNull();

        act(() => {
            result.current.snoozeAlarm(5);
        });
        expect(result.current.activeAlarm).toBeNull();
    });
});
