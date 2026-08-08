import { useCallback, useEffect, useRef, useState } from 'react';
import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import {
    buildCalendarReminderKey,
    resolveCalendarReminderTickMs,
    scanAndFireCalendarReminders,
    type CalendarReminderMinutes,
} from '@/app/services/calendar/calendarEventReminder';
import { showHamiNotification } from '@/app/services/notifications/HamiNotificationBridge';
import {
    shouldFireCalendarAlarm,
    shouldPlayCalendarAlarmSound,
} from '@/app/services/notifications/notificationAlertPolicy';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';
import {
    shouldFireCalendarAlarm,
    shouldPlayCalendarAlarmSound,
} from '@/app/services/notifications/notificationAlertPolicy';
import type { CalendarReminderAlarmPayload } from '@/app/components/lawyer/SmartLegalRadar/CalendarReminderModal';

export function useCalendarEventReminders(events: CalendarEvent[], enabled: boolean) {
    const [activeAlarm, setActiveAlarm] = useState<CalendarReminderAlarmPayload | null>(null);
    const snoozedUntilRef = useRef<Map<string, number>>(new Map());
    const eventsRef = useRef(events);
    eventsRef.current = events;

    const isSnoozed = useCallback((key: string) => {
        const until = snoozedUntilRef.current.get(key);
        if (!until) return false;
        if (Date.now() >= until) {
            snoozedUntilRef.current.delete(key);
            return false;
        }
        return true;
    }, []);

    const fireReminder = useCallback((event: CalendarEvent, fireAt: Date) => {
        const minutes = event.reminderMinutesBefore ?? 0;
        if (!minutes) return;

        const settings = getLawyerSettingsSnapshot();
        if (!shouldFireCalendarAlarm(settings) && !shouldPlayCalendarAlarmSound(settings)) {
            return;
        }

        const payload: CalendarReminderAlarmPayload = {
            event,
            fireAt,
            reminderMinutesBefore: minutes,
        };

        if (shouldFireCalendarAlarm(settings)) {
            setActiveAlarm(payload);
        }

        const timeLabel = event.time ? ` · ${event.time}` : '';
        void showHamiNotification(
            'calendar',
            {
                title: 'تذكير موعد — حامي',
                body: `${event.title}${timeLabel}`,
                tag: `calendar-reminder-${event.id}`,
                requireInteraction: true,
                data: { type: 'calendar-reminder', eventId: event.id },
            },
            true,
        );
    }, []);

    useEffect(() => {
        if (!enabled) return;

        let timer: number | null = null;

        const tick = () => {
            scanAndFireCalendarReminders(
                eventsRef.current,
                new Date(),
                fireReminder,
                { isSnoozed },
            );

            const nextMs = resolveCalendarReminderTickMs(eventsRef.current, new Date());
            timer = window.setTimeout(tick, nextMs);
        };

        tick();

        return () => {
            if (timer !== null) window.clearTimeout(timer);
        };
    }, [enabled, fireReminder, isSnoozed]);

    const dismissAlarm = useCallback(() => {
        setActiveAlarm(null);
    }, []);

    const snoozeAlarm = useCallback(
        (minutes: CalendarReminderMinutes) => {
            const alarm = activeAlarm;
            if (!alarm) return;
            const key = buildCalendarReminderKey(
                alarm.event.id,
                alarm.event.date,
                alarm.event.time ?? '',
                alarm.reminderMinutesBefore,
            );
            snoozedUntilRef.current.set(key, Date.now() + minutes * 60_000);
            setActiveAlarm(null);
        },
        [activeAlarm],
    );

    return {
        activeAlarm,
        dismissAlarm,
        snoozeAlarm,
    };
}
