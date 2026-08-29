import {
    clearSecureJsonValue,
    readSecureJsonRawSync,
    writeSecureJsonValue,
} from '@/app/services/storage/syncSecureJson';

const STORAGE_KEY = 'hami-calendar-reminder-snooze-v1';
const MAX_ENTRIES = 80;

export const HAMI_CALENDAR_NATIVE_SYNC_EVENT = 'hami:calendar-native-sync';

export type CalendarReminderSnoozeRecord = {
    key: string;
    eventId: string;
    date: string;
    time: string;
    reminderMinutesBefore: number;
    title: string;
    location?: string;
    untilMs: number;
};

function isRecord(value: unknown): value is CalendarReminderSnoozeRecord {
    if (!value || typeof value !== 'object') return false;
    const row = value as CalendarReminderSnoozeRecord;
    return (
        typeof row.key === 'string' &&
        typeof row.eventId === 'string' &&
        typeof row.date === 'string' &&
        typeof row.time === 'string' &&
        typeof row.reminderMinutesBefore === 'number' &&
        typeof row.title === 'string' &&
        typeof row.untilMs === 'number' &&
        Number.isFinite(row.untilMs)
    );
}

function readAll(): CalendarReminderSnoozeRecord[] {
    try {
        const raw = readSecureJsonRawSync(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(isRecord);
    } catch {
        return [];
    }
}

function writeAll(entries: CalendarReminderSnoozeRecord[]): void {
    writeSecureJsonValue(STORAGE_KEY, entries.slice(-MAX_ENTRIES));
}

export function readCalendarReminderSnoozes(nowMs: number = Date.now()): CalendarReminderSnoozeRecord[] {
    const active = readAll().filter((row) => row.untilMs > nowMs);
    writeAll(active);
    return active;
}

export function upsertCalendarReminderSnooze(record: CalendarReminderSnoozeRecord): void {
    const next = readAll().filter((row) => row.key !== record.key);
    next.push(record);
    writeAll(next);
}

export function removeCalendarReminderSnooze(key: string): void {
    writeAll(readAll().filter((row) => row.key !== key));
}

export function isCalendarReminderSnoozed(key: string, nowMs: number = Date.now()): boolean {
    return readCalendarReminderSnoozes(nowMs).some((row) => row.key === key);
}

export function requestCalendarNativeReminderSync(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(HAMI_CALENDAR_NATIVE_SYNC_EVENT));
}

export function clearCalendarReminderSnoozesForTests(): void {
    clearSecureJsonValue(STORAGE_KEY);
}
