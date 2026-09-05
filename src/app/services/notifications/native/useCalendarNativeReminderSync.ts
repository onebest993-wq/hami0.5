import { useCallback, useEffect } from 'react';
import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import { CALENDAR_UPDATED_EVENT } from '@/app/services/calendarBridge.types';
import { getCachedCalendarEvents } from '@/app/services/calendar/calendarEventsCache';
import { peekLocalCalendarSnapshotSync } from '@/app/services/calendar/calendarLocalSnapshot';
import { buildCalendarNativeSchedules, buildCalendarSnoozeNativeSchedules } from '@/app/services/notifications/native/calendarNativeReminderScheduler';
import {
    initializeHamiNotificationBridge,
    syncNativeScheduledNotifications,
} from '@/app/services/notifications/HamiNotificationBridge';
import {
    HAMI_CALENDAR_NATIVE_SYNC_EVENT,
    readCalendarReminderSnoozes,
} from '@/app/services/calendar/calendarReminderSnoozeStore';
import { useVisibilityAwareInterval } from '@/app/hooks/useVisibilityAwareInterval';

function loadCalendarEvents(userId: string): CalendarEvent[] {
    const cached = getCachedCalendarEvents(userId);
    const list = cached ?? peekLocalCalendarSnapshotSync(userId);
    return Array.isArray(list) ? list : [];
}

const NATIVE_REMINDER_RESYNC_MS = 5 * 60_000;

/** يجدول تذكيرات التقويم على النظام — يعمل والتطبيق مغلق. إعادة المزامنة من JS تتوقف في الخلفية. */
export function useCalendarNativeReminderSync(userId: string, enabled: boolean): void {
    const sync = useCallback(async () => {
        if (!enabled || !userId) return;
        await initializeHamiNotificationBridge();
        const events = loadCalendarEvents(userId);
        const snoozes = readCalendarReminderSnoozes();
        const schedules = [
            ...buildCalendarNativeSchedules(events),
            ...buildCalendarSnoozeNativeSchedules(snoozes),
        ];
        await syncNativeScheduledNotifications(schedules);
    }, [enabled, userId]);

    useEffect(() => {
        if (!enabled || !userId) return;

        let cancelled = false;
        void sync().then(() => {
            if (cancelled) return;
        });

        const onCalendarUpdated = () => {
            void sync();
        };

        window.addEventListener(CALENDAR_UPDATED_EVENT, onCalendarUpdated);
        window.addEventListener('hami:settings-updated', onCalendarUpdated);
        window.addEventListener(HAMI_CALENDAR_NATIVE_SYNC_EVENT, onCalendarUpdated);

        return () => {
            cancelled = true;
            window.removeEventListener(CALENDAR_UPDATED_EVENT, onCalendarUpdated);
            window.removeEventListener('hami:settings-updated', onCalendarUpdated);
            window.removeEventListener(HAMI_CALENDAR_NATIVE_SYNC_EVENT, onCalendarUpdated);
        };
    }, [enabled, userId, sync]);

    useVisibilityAwareInterval(() => {
        void sync();
    }, NATIVE_REMINDER_RESYNC_MS, enabled && Boolean(userId));
}
