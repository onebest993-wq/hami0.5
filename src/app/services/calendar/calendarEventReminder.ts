import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import {
    isCalendarReminderFired,
    markCalendarReminderFired,
} from '@/app/services/calendar/calendarReminderFiredStore';

export const CALENDAR_REMINDER_OPTIONS_MINUTES = [5, 10, 15, 30, 60] as const;

export type CalendarReminderMinutes = (typeof CALENDAR_REMINDER_OPTIONS_MINUTES)[number];

/** نافذة إطلاق التذكير — 5 دقائق لتفادي فوات الفحص */
export const CALENDAR_REMINDER_FIRE_WINDOW_MS = 5 * 60_000;

const firedReminderKeys = new Set<string>();

export function formatCalendarReminderLabel(minutes: number): string {
    if (minutes >= 60 && minutes % 60 === 0) {
        const hours = minutes / 60;
        return hours === 1 ? 'قبل ساعة' : `قبل ${hours} ساعات`;
    }
    return `قبل ${minutes} د`;
}

export function formatCalendarReminderChip(minutes: number): string {
    if (minutes >= 60 && minutes % 60 === 0) {
        return minutes === 60 ? '١س' : `${minutes / 60}س`;
    }
    return `${minutes}د`;
}

export function formatCalendarReminderSnoozeLabel(minutes: number): string {
    if (minutes === 1) return 'دقيقة واحدة';
    if (minutes === 2) return 'دقيقتان';
    if (minutes >= 3 && minutes <= 10) return `${minutes} دقائق`;
    return `${minutes} دقيقة`;
}

export function buildCalendarReminderKey(
    eventId: string,
    date: string,
    time: string,
    minutesBefore: number,
): string {
    return `${eventId}|${date}|${time}|${minutesBefore}`;
}

/** وقت إطلاق التذكير — null إذا لا وقت أو لا تذكير */
export function computeCalendarReminderFireAt(
    date: string,
    time: string | undefined,
    minutesBefore: number | null | undefined,
): Date | null {
    const ymd = date?.trim().slice(0, 10);
    const hm = time?.trim();
    const lead = minutesBefore ?? 0;
    if (!ymd || !hm || lead <= 0) return null;

    const fire = new Date(`${ymd}T${hm}:00`);
    if (Number.isNaN(fire.getTime())) return null;
    fire.setMinutes(fire.getMinutes() - lead);
    return fire;
}

export function isCalendarReminderKeyFired(key: string): boolean {
    return firedReminderKeys.has(key) || isCalendarReminderFired(key);
}

export function rememberCalendarReminderFired(key: string): void {
    firedReminderKeys.add(key);
    markCalendarReminderFired(key);
}

export function resolveCalendarReminderTickMs(
    events: CalendarEvent[],
    now: Date = new Date(),
): number {
    const nowMs = now.getTime();
    let nearestFutureMs = Infinity;

    for (const event of events) {
        const minutes = event.reminderMinutesBefore;
        if (!minutes || minutes <= 0) continue;
        const fireAt = computeCalendarReminderFireAt(event.date, event.time, minutes);
        if (!fireAt) continue;
        const delta = fireAt.getTime() - nowMs;
        if (delta > 0 && delta < nearestFutureMs) {
            nearestFutureMs = delta;
        }
    }

    if (nearestFutureMs <= 2 * 60_000) return 5_000;
    if (nearestFutureMs <= 15 * 60_000) return 12_000;
    return 30_000;
}

export function scanAndFireCalendarReminders(
    events: CalendarEvent[],
    now: Date = new Date(),
    onFire?: (event: CalendarEvent, fireAt: Date) => void,
    options?: {
        isSnoozed?: (key: string) => boolean;
    },
): void {
    const nowMs = now.getTime();
    for (const event of events) {
        const minutes = event.reminderMinutesBefore;
        if (!minutes || minutes <= 0) continue;
        const fireAt = computeCalendarReminderFireAt(event.date, event.time, minutes);
        if (!fireAt) continue;
        const fireMs = fireAt.getTime();
        if (nowMs < fireMs || nowMs > fireMs + CALENDAR_REMINDER_FIRE_WINDOW_MS) continue;

        const key = buildCalendarReminderKey(event.id, event.date, event.time ?? '', minutes);
        if (options?.isSnoozed?.(key)) continue;
        if (isCalendarReminderKeyFired(key)) continue;

        rememberCalendarReminderFired(key);
        onFire?.(event, fireAt);
    }
}

export function resetCalendarReminderFiredKeysForTests(): void {
    firedReminderKeys.clear();
}
