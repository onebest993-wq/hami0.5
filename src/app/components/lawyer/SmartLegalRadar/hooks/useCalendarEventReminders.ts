import { useCallback, useEffect, useRef, useState } from 'react';
import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import {
    buildCalendarReminderKey,
    resolveCalendarReminderTickMs,
    scanAndFireCalendarReminders,
    type CalendarReminderMinutes,
} from '@/app/services/calendar/calendarEventReminder';
import {
    isCalendarReminderSnoozed,
    readCalendarReminderSnoozes,
    removeCalendarReminderSnooze,
    requestCalendarNativeReminderSync,
    upsertCalendarReminderSnooze,
} from '@/app/services/calendar/calendarReminderSnoozeStore';
import {
    shouldFireCalendarAlarm,
    shouldPlayCalendarAlarmSound,
} from '@/app/services/notifications/notificationAlertPolicy';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';
import type { CalendarReminderAlarmPayload } from '@/app/components/lawyer/SmartLegalRadar/CalendarReminderModal';

function eventFromId(events: CalendarEvent[], eventId: string): CalendarEvent | undefined {
    return events.find((event) => event.id === eventId);
}

export function useCalendarEventReminders(events: CalendarEvent[], enabled: boolean) {
    const [activeAlarm, setActiveAlarm] = useState<CalendarReminderAlarmPayload | null>(null);
    const eventsRef = useRef(events);
    eventsRef.current = events;
    const snoozeTimersRef = useRef<Map<string, number>>(new Map());

    const isSnoozed = useCallback((key: string) => isCalendarReminderSnoozed(key), []);

    const presentAlarm = useCallback((event: CalendarEvent, fireAt: Date = new Date()) => {
        const minutes = event.reminderMinutesBefore ?? 0;
        const settings = getLawyerSettingsSnapshot();
        if (!shouldFireCalendarAlarm(settings) && !shouldPlayCalendarAlarmSound(settings)) {
            return false;
        }
        setActiveAlarm({
            event,
            fireAt,
            reminderMinutesBefore: minutes > 0 ? minutes : 10,
        });
        return true;
    }, []);

    const fireReminder = useCallback((event: CalendarEvent, fireAt: Date) => {
        const minutes = event.reminderMinutesBefore ?? 0;
        if (!minutes) return;

        const settings = getLawyerSettingsSnapshot();
        if (!shouldFireCalendarAlarm(settings) && !shouldPlayCalendarAlarmSound(settings)) {
            return;
        }

        presentAlarm(event, fireAt);

        const timeLabel = event.time ? ` · ${event.time}` : '';
        void import('@/app/services/notifications/bridge/hamiBridgePresent').then((m) => {
            void m.showHamiNotification(
                'calendar',
                {
                    title: 'تذكير موعد — حامي',
                    body: `${event.title}${timeLabel}`,
                    tag: `calendar-reminder-${event.id}`,
                    requireInteraction: true,
                    data: { type: 'calendar-reminder', eventId: event.id, date: event.date },
                },
                true,
            );
        });
    }, [presentAlarm]);

    const presentAlarmForEventId = useCallback(
        (eventId: string) => {
            const trimmed = eventId.trim();
            if (!trimmed) return false;
            const event = eventFromId(eventsRef.current, trimmed);
            if (!event) return false;
            return presentAlarm(event);
        },
        [presentAlarm],
    );

    const clearSnoozeTimer = useCallback((key: string) => {
        const timer = snoozeTimersRef.current.get(key);
        if (timer !== undefined) {
            window.clearTimeout(timer);
            snoozeTimersRef.current.delete(key);
        }
    }, []);

    const armSnoozeTimer = useCallback(
        (key: string, untilMs: number, eventId: string) => {
            clearSnoozeTimer(key);
            const delay = Math.max(0, untilMs - Date.now());
            const timer = window.setTimeout(() => {
                snoozeTimersRef.current.delete(key);
                removeCalendarReminderSnooze(key);
                const event = eventFromId(eventsRef.current, eventId);
                if (event) presentAlarm(event, new Date());
            }, delay);
            snoozeTimersRef.current.set(key, timer);
        },
        [clearSnoozeTimer, presentAlarm],
    );

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

    useEffect(() => {
        if (!enabled) {
            for (const timer of snoozeTimersRef.current.values()) {
                window.clearTimeout(timer);
            }
            snoozeTimersRef.current.clear();
            return;
        }
        for (const snooze of readCalendarReminderSnoozes()) {
            armSnoozeTimer(snooze.key, snooze.untilMs, snooze.eventId);
        }
        return () => {
            for (const timer of snoozeTimersRef.current.values()) {
                window.clearTimeout(timer);
            }
            snoozeTimersRef.current.clear();
        };
    }, [enabled, armSnoozeTimer]);

    const dismissAlarm = useCallback(() => {
        const alarm = activeAlarm;
        if (alarm) {
            const key = buildCalendarReminderKey(
                alarm.event.id,
                alarm.event.date,
                alarm.event.time ?? '',
                alarm.reminderMinutesBefore,
            );
            removeCalendarReminderSnooze(key);
            clearSnoozeTimer(key);
            requestCalendarNativeReminderSync();
        }
        setActiveAlarm(null);
    }, [activeAlarm, clearSnoozeTimer]);

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
            const untilMs = Date.now() + minutes * 60_000;
            upsertCalendarReminderSnooze({
                key,
                eventId: alarm.event.id,
                date: alarm.event.date,
                time: alarm.event.time ?? '',
                reminderMinutesBefore: alarm.reminderMinutesBefore,
                title: alarm.event.title,
                location: alarm.event.location,
                untilMs,
            });
            armSnoozeTimer(key, untilMs, alarm.event.id);
            requestCalendarNativeReminderSync();
            setActiveAlarm(null);
        },
        [activeAlarm, armSnoozeTimer],
    );

    return {
        activeAlarm,
        dismissAlarm,
        snoozeAlarm,
        presentAlarmForEventId,
    };
}
