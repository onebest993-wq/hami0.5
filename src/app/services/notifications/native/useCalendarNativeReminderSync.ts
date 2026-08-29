import { useEffect } from 'react';
import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import { CALENDAR_UPDATED_EVENT } from '@/app/services/calendarBridge.types';
import { getCachedCalendarEvents } from '@/app/services/calendar/calendarEventsCache';
import { readLocalCalendarSnapshotSync } from '@/app/services/calendar/calendarLocalSnapshot';
import { buildCalendarNativeSchedules, buildCalendarSnoozeNativeSchedules } from '@/app/services/notifications/native/calendarNativeReminderScheduler';
import {
    initializeHamiNotificationBridge,
    syncNativeScheduledNotifications,
} from '@/app/services/notifications/HamiNotificationBridge';
import {
    HAMI_CALENDAR_NATIVE_SYNC_EVENT,
    readCalendarReminderSnoozes,
} from '@/app/services/calendar/calendarReminderSnoozeStore';

function loadCalendarEvents(userId: string): CalendarEvent[] {
    const cached = getCachedCalendarEvents(userId);
    const list = cached ?? readLocalCalendarSnapshotSync(userId);
    return Array.isArray(list) ? list : [];
}

/** يجدول تذكيرات التقويم على النظام — يعمل والتطبيق مغلق */
export function useCalendarNativeReminderSync(userId: string, enabled: boolean): void {
    useEffect(() => {
        if (!enabled || !userId) return;

        let cancelled = false;

        const sync = async () => {
            if (cancelled) return;
            await initializeHamiNotificationBridge();
            const events = loadCalendarEvents(userId);
            const snoozes = readCalendarReminderSnoozes();
            const schedules = [
                ...buildCalendarNativeSchedules(events),
                ...buildCalendarSnoozeNativeSchedules(snoozes),
            ];
            await syncNativeScheduledNotifications(schedules);
        };

        void sync();

        const onCalendarUpdated = () => {
            void sync();
        };

        const onSettingsUpdated = () => {
            void sync();
        };

        window.addEventListener(CALENDAR_UPDATED_EVENT, onCalendarUpdated);
        window.addEventListener('hami:settings-updated', onSettingsUpdated);
        window.addEventListener(HAMI_CALENDAR_NATIVE_SYNC_EVENT, onCalendarUpdated);

        const interval = window.setInterval(() => {
            void sync();
        }, 5 * 60_000);

        return () => {
            cancelled = true;
            window.removeEventListener(CALENDAR_UPDATED_EVENT, onCalendarUpdated);
            window.removeEventListener('hami:settings-updated', onSettingsUpdated);
            window.removeEventListener(HAMI_CALENDAR_NATIVE_SYNC_EVENT, onCalendarUpdated);
            window.clearInterval(interval);
        };
    }, [enabled, userId]);
}
