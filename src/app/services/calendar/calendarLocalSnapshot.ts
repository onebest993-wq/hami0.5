import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import {
    clearLegacyPlaintextMirror,
    readSecureOrDrainLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';

/** مفتاح التخزين المحلي — يطابق lawyer-cloud CalendarDB */
export const CALENDAR_LOCAL_STORAGE_KEY = 'hami:calendar:events:v1';

const LOCAL_TOMBSTONES_KEY = 'hami:calendar:tombstones:v1';

function parseJsonUnknown(raw: string | null): unknown {
    if (raw == null) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function readStorageJsonSync(key: string): unknown {
    return parseJsonUnknown(readSecureOrDrainLegacySync(key));
}

function tombstoneIdsForUserSync(userId: string): Set<string> {
    const parsed = readStorageJsonSync(LOCAL_TOMBSTONES_KEY);
    if (!parsed || typeof parsed !== 'object') return new Set<string>();
    const list = (parsed as Record<string, Array<{ eventId?: string }>>)[userId];
    if (!Array.isArray(list)) return new Set<string>();
    const ids = new Set<string>();
    for (const t of list) {
        if (typeof t?.eventId === 'string' && t.eventId) ids.add(t.eventId);
    }
    return ids;
}

/**
 * قراءة فورية (sync) — للعرض الأولي قبل getEvents.
 * SecureStore / decryptedCache؛ مرآة localStorage تُرحَّل وتُمحى عند أول قراءة.
 */
export function readLocalCalendarSnapshotSync(userId: string): CalendarEvent[] {
    if (!userId) return [];
    const parsed = readStorageJsonSync(CALENDAR_LOCAL_STORAGE_KEY);
    if (!Array.isArray(parsed)) return [];

    const tombstones = tombstoneIdsForUserSync(userId);
    const events: CalendarEvent[] = [];
    for (const raw of parsed) {
        if (!raw || typeof raw !== 'object') continue;
        const e = raw as CalendarEvent;
        if (e.userId !== userId) continue;
        if (typeof e.id !== 'string' || !e.id) continue;
        if (tombstones.has(e.id)) continue;
        events.push(e);
    }
    return events;
}

/** هل توجد لقطة محلية قابلة للعرض فوراً؟ */
export function hasLocalCalendarSnapshot(userId: string): boolean {
    return readLocalCalendarSnapshotSync(userId).length > 0;
}

/** لم تعد تُكتب مرآة صريحة — تُمحى بقايا localStorage بعد الحفظ المشفّر */
export function mirrorCalendarEventsToLocalStorage(_payload: string): void {
    clearLegacyPlaintextMirror(CALENDAR_LOCAL_STORAGE_KEY);
}

export function clearCalendarEventsLocalStorageMirror(): void {
    clearLegacyPlaintextMirror(CALENDAR_LOCAL_STORAGE_KEY);
}

/** لم تعد تُكتب مرآة صريحة — تُمحى بقايا localStorage بعد الحفظ المشفّر */
export function mirrorCalendarTombstonesToLocalStorage(_payload: string): void {
    clearLegacyPlaintextMirror(LOCAL_TOMBSTONES_KEY);
}
