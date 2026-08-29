import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import {
    buildCalendarReminderKey,
    computeCalendarReminderFireAt,
} from '@/app/services/calendar/calendarEventReminder';
import type { CalendarReminderSnoozeRecord } from '@/app/services/calendar/calendarReminderSnoozeStore';
import {
    calendarNativeNotificationKey,
    calendarNativeSnoozeNotificationKey,
    hashToNativeNotificationId,
    nativeChannelIdForKey,
} from '@/app/services/notifications/native/nativeNotificationChannels';
import {
    shouldPlayChannelSound,
    shouldSendOsPush,
} from '@/app/services/notifications/notificationAlertPolicy';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';

const MAX_SCHEDULE_HORIZON_MS = 60 * 24 * 60 * 60 * 1000;

export type NativeScheduledNotification = {
    id: number;
    key: string;
    title: string;
    body: string;
    channelId: string;
    fireAt: Date;
    silent: boolean;
    extra: Record<string, unknown>;
    /** بلا جدول AlarmManager — NotificationManager.notify فوراً */
    immediate?: boolean;
};

function calendarAlarmExtra(eventId: string, reminderKey: string, date: string): Record<string, unknown> {
    return {
        type: 'calendar-reminder',
        eventId,
        date,
        reminderKey,
    };
}

export function buildCalendarNativeSchedules(
    events: CalendarEvent[],
    now: Date = new Date(),
): NativeScheduledNotification[] {
    const settings = getLawyerSettingsSnapshot();
    const nowMs = now.getTime();
    const horizon = nowMs + MAX_SCHEDULE_HORIZON_MS;
    const out: NativeScheduledNotification[] = [];

    for (const event of events) {
        const minutes = event.reminderMinutesBefore;
        if (!minutes || minutes <= 0 || !event.time?.trim()) continue;

        const fireAt = computeCalendarReminderFireAt(event.date, event.time, minutes);
        if (!fireAt) continue;

        const fireMs = fireAt.getTime();
        if (fireMs <= nowMs || fireMs > horizon) continue;
        if (!shouldSendOsPush('calendar', settings, true) && !shouldPlayChannelSound('calendar', settings, true)) {
            continue;
        }

        const key = calendarNativeNotificationKey(event.id, event.date, event.time, minutes);
        const timeLabel = event.time ? ` · ${event.time}` : '';

        out.push({
            id: hashToNativeNotificationId(key),
            key,
            title: 'تذكير موعد — حامي',
            body: `${event.title}${timeLabel}`,
            channelId: nativeChannelIdForKey('calendar'),
            fireAt,
            silent: !shouldPlayChannelSound('calendar', settings, true),
            extra: calendarAlarmExtra(
                event.id,
                buildCalendarReminderKey(event.id, event.date, event.time ?? '', minutes),
                event.date,
            ),
        });
    }

    return out;
}

export function buildCalendarSnoozeNativeSchedules(
    snoozes: CalendarReminderSnoozeRecord[],
    now: Date = new Date(),
): NativeScheduledNotification[] {
    const settings = getLawyerSettingsSnapshot();
    const nowMs = now.getTime();
    if (!shouldSendOsPush('calendar', settings, true) && !shouldPlayChannelSound('calendar', settings, true)) {
        return [];
    }

    const out: NativeScheduledNotification[] = [];
    for (const snooze of snoozes) {
        if (snooze.untilMs <= nowMs) continue;
        const key = calendarNativeSnoozeNotificationKey(snooze.eventId, snooze.untilMs);
        const timeLabel = snooze.time ? ` · ${snooze.time}` : '';
        out.push({
            id: hashToNativeNotificationId(key),
            key,
            title: 'تذكير موعد — حامي',
            body: `${snooze.title}${timeLabel}`,
            channelId: nativeChannelIdForKey('calendar'),
            fireAt: new Date(snooze.untilMs),
            silent: !shouldPlayChannelSound('calendar', settings, true),
            extra: calendarAlarmExtra(snooze.eventId, snooze.key, snooze.date),
        });
    }
    return out;
}

export function buildImmediateNativeNotification(input: {
    key: string;
    channel: import('@/app/services/settings/notificationSettings').NotificationChannelKey;
    title: string;
    body: string;
    critical?: boolean;
    extra?: Record<string, unknown>;
}): NativeScheduledNotification | null {
    const settings = getLawyerSettingsSnapshot();
    const critical = input.critical ?? false;
    if (!shouldSendOsPush(input.channel, settings, critical)) return null;

    return {
        id: hashToNativeNotificationId(input.key),
        key: input.key,
        title: input.title,
        body: input.body,
        channelId: nativeChannelIdForKey(input.channel),
        fireAt: new Date(Date.now() + 800),
        silent: !shouldPlayChannelSound(input.channel, settings, critical),
        extra: input.extra ?? {},
        immediate: true,
    };
}
