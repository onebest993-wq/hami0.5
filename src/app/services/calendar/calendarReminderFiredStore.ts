const STORAGE_KEY = 'hami-calendar-reminder-fired-v1';
const MAX_ENTRIES = 200;

function readEntries(): string[] {
    if (typeof localStorage === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? parsed.filter((k) => typeof k === 'string') : [];
    } catch {
        return [];
    }
}

function writeEntries(entries: string[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
    } catch {
        /* ignore quota */
    }
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
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        /* ignore */
    }
}
