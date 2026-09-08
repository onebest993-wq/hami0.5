import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import { isUsableCalendarEventRecord } from '@/app/services/calendar/calendarEventRecord';
import {
    CALENDAR_EVENTS_STORAGE_KEY,
    CALENDAR_TOMBSTONES_STORAGE_KEY,
} from '@/app/services/calendar/calendarStorageKeys';
import {
    clearLegacyPlaintextMirror,
    peekSecureOrLegacySync,
    readSecureOrDrainLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';
import SecureStoreService from '@/app/services/SecureStoreService';

export const CALENDAR_LOCAL_STORAGE_KEY = CALENDAR_EVENTS_STORAGE_KEY;

function parseJsonUnknown(raw: string | null): unknown {
    if (raw == null) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function tombstoneIdsFromParsed(parsed: unknown, userId: string): Set<string> {
    if (!parsed || typeof parsed !== 'object') return new Set<string>();
    const list = (parsed as Record<string, Array<{ eventId?: string }>>)[userId];
    if (!Array.isArray(list)) return new Set<string>();
    const ids = new Set<string>();
    for (const t of list) {
        if (typeof t?.eventId === 'string' && t.eventId) ids.add(t.eventId);
    }
    return ids;
}

function collectEventsForUser(userId: string, eventsRaw: unknown, tombsRaw: unknown): CalendarEvent[] {
    if (!Array.isArray(eventsRaw)) return [];
    const tombstones = tombstoneIdsFromParsed(tombsRaw, userId);
    const events: CalendarEvent[] = [];
    for (const raw of eventsRaw) {
        if (!isUsableCalendarEventRecord(raw)) continue;
        if (raw.userId !== userId) continue;
        if (tombstones.has(raw.id)) continue;
        events.push(raw);
    }
    return events;
}

/** أول طلاء — بلا ترحيل ولا setItemSync */
export function peekLocalCalendarSnapshotSync(userId: string): CalendarEvent[] {
    if (!userId) return [];
    // L4 SecureStore At-Rest: التأكد من جاهزية المخزن المؤمن قبل أول قراءة لقطة لسلسلة الأحداث (anti-partial-unlock)
    try { if (typeof SecureStoreService?.ensurePersistedReady === 'function') void SecureStoreService.ensurePersistedReady(); } catch { /* ignore */ }
    return collectEventsForUser(
        userId,
        parseJsonUnknown(peekSecureOrLegacySync(CALENDAR_LOCAL_STORAGE_KEY)),
        parseJsonUnknown(peekSecureOrLegacySync(CALENDAR_TOMBSTONES_STORAGE_KEY)),
    );
}

/**
 * قراءة مع ترحيل مرآة localStorage — ليس لمسار أول إطار.
 * SecureStore / decryptedCache؛ المرآة تُرحَّل وتُمحى.
 */
export function readLocalCalendarSnapshotSync(userId: string): CalendarEvent[] {
    if (!userId) return [];
    return collectEventsForUser(
        userId,
        parseJsonUnknown(readSecureOrDrainLegacySync(CALENDAR_LOCAL_STORAGE_KEY)),
        parseJsonUnknown(readSecureOrDrainLegacySync(CALENDAR_TOMBSTONES_STORAGE_KEY)),
    );
}

export function clearCalendarEventsLocalStorageMirror(): void {
    clearLegacyPlaintextMirror(CALENDAR_LOCAL_STORAGE_KEY);
}
