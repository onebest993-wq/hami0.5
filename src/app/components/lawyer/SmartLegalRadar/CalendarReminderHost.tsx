import { useEffect, useState } from 'react';
import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import { CALENDAR_UPDATED_EVENT } from '@/app/services/calendarBridge.types';
import { getCachedCalendarEvents } from '@/app/services/calendar/calendarEventsCache';
import { readLocalCalendarSnapshotSync } from '@/app/services/calendar/calendarLocalSnapshot';
import { CalendarReminderModal } from '@/app/components/lawyer/SmartLegalRadar/CalendarReminderModal';
import { useCalendarEventReminders } from '@/app/components/lawyer/SmartLegalRadar/hooks/useCalendarEventReminders';
import { useCalendarNativeReminderSync } from '@/app/services/notifications/native/useCalendarNativeReminderSync';

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

    const { activeAlarm, dismissAlarm, snoozeAlarm } = useCalendarEventReminders(events, enabled && Boolean(userId));
    useCalendarNativeReminderSync(userId, enabled && Boolean(userId));

    return (
        <CalendarReminderModal
            alarm={activeAlarm}
            onDismiss={dismissAlarm}
            onSnooze={snoozeAlarm}
        />
    );
}
