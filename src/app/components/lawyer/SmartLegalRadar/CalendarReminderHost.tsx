import { useEffect, useState } from 'react';
import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import { CALENDAR_UPDATED_EVENT } from '@/app/services/calendarBridge.types';
import { getCachedCalendarEvents } from '@/app/services/calendar/calendarEventsCache';
import { readLocalCalendarSnapshotSync } from '@/app/services/calendar/calendarLocalSnapshot';
import { CalendarReminderModal } from '@/app/components/lawyer/SmartLegalRadar/CalendarReminderModal';
import { useCalendarEventReminders } from '@/app/components/lawyer/SmartLegalRadar/hooks/useCalendarEventReminders';
import { useCalendarNativeReminderSync } from '@/app/services/notifications/native/useCalendarNativeReminderSync';
import { HAMI_NATIVE_NOTIFICATION_RECEIVED_EVENT } from '@/app/services/notifications/notificationOsTapEvents';
import { extractOsNotificationTapData } from '@/app/services/notifications/osTap/notificationOsTapExtract';
import {
    clearPendingCalendarAlarmEventId,
    peekPendingCalendarAlarmEventId,
    stashPendingCalendarAlarmEventId,
} from '@/app/services/notifications/osTap/calendarAlarmPending';

function loadReminderEvents(userId: string): CalendarEvent[] {
    const cached = getCachedCalendarEvents(userId);
    const list = cached ?? readLocalCalendarSnapshotSync(userId);
    if (!Array.isArray(list)) return [];
    return list.filter(
        (event) =>
            Boolean(event.time?.trim()) &&
            typeof event.reminderMinutesBefore === 'number' &&
            event.reminderMinutesBefore > 0,
    );
}

function calendarEventIdFromNotificationDetail(detail: unknown): string | null {
    const raw = extractOsNotificationTapData(detail);
    const type = typeof raw.type === 'string' ? raw.type.trim() : '';
    if (type !== 'calendar-reminder' && type !== 'calendar_reminder') return null;
    const eventId = typeof raw.eventId === 'string' ? raw.eventId.trim() : '';
    return eventId || null;
}

type CalendarReminderHostProps = {
    userId: string;
    enabled?: boolean;
};

/** محرك تذكير التقويم على مستوى اللوحة — يعمل في كل التبويبات */
export function CalendarReminderHost({ userId, enabled = true }: CalendarReminderHostProps) {
    const [events, setEvents] = useState<CalendarEvent[]>([]);

    useEffect(() => {
        if (!enabled || !userId) {
            setEvents([]);
            return;
        }

        const sync = () => {
            setEvents(loadReminderEvents(userId));
        };

        sync();
        window.addEventListener(CALENDAR_UPDATED_EVENT, sync);
        return () => window.removeEventListener(CALENDAR_UPDATED_EVENT, sync);
    }, [enabled, userId]);

    const { activeAlarm, dismissAlarm, snoozeAlarm, presentAlarmForEventId } = useCalendarEventReminders(
        events,
        enabled && Boolean(userId),
    );
    useCalendarNativeReminderSync(userId, enabled && Boolean(userId));

    useEffect(() => {
        if (!enabled || !userId) return;

        const tryPresent = (eventId: string) => {
            if (presentAlarmForEventId(eventId)) {
                clearPendingCalendarAlarmEventId();
                return true;
            }
            stashPendingCalendarAlarmEventId(eventId);
            return false;
        };

        const pending = peekPendingCalendarAlarmEventId();
        if (pending) tryPresent(pending);

        const onNative = (event: Event) => {
            const eventId = calendarEventIdFromNotificationDetail((event as CustomEvent).detail);
            if (eventId) tryPresent(eventId);
        };

        window.addEventListener(HAMI_NATIVE_NOTIFICATION_RECEIVED_EVENT, onNative);
        return () => window.removeEventListener(HAMI_NATIVE_NOTIFICATION_RECEIVED_EVENT, onNative);
    }, [enabled, userId, events, presentAlarmForEventId]);

    return (
        <CalendarReminderModal
            alarm={activeAlarm}
            onDismiss={dismissAlarm}
            onSnooze={snoozeAlarm}
        />
    );
}
