import {
    clearSecureJsonValue,
    readSecureJsonRawSync,
    writeSecureJsonValue,
} from '@/app/services/storage/syncSecureJson';

const STORAGE_KEY = 'hami-calendar-reminder-fired-v1';
const MAX_ENTRIES = 200;

function readEntries(): string[] {
    try {
        const raw = readSecureJsonRawSync(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? parsed.filter((k) => typeof k === 'string') : [];
    } catch {
        return [];
    }
}

function writeEntries(entries: string[]): void {
    writeSecureJsonValue(STORAGE_KEY, entries.slice(-MAX_ENTRIES));
}

export function isCalendarReminderFired(key: string): boolean {
    return readEntries().includes(key);
}

export function markCalendarReminderFired(key: string): void {
    const entries = readEntries();
    if (entries.includes(key)) return;
    writeEntries([...entries, key]);
}

export function clearCalendarReminderFiredForTests(): void {
    clearSecureJsonValue(STORAGE_KEY);
}
