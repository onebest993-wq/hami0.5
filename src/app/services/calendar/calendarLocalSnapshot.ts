import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import SecureStoreService from '@/app/services/SecureStoreService';

/** مفتاح التخزين المحلي — يطابق lawyer-cloud CalendarDB */
export const CALENDAR_LOCAL_STORAGE_KEY = 'hami:calendar:events:v1';

const LOCAL_TOMBSTONES_KEY = 'hami:calendar:tombstones:v1';

function readLocalStorageJson(key: string): unknown {
    if (typeof localStorage === 'undefined') return null;
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/** قراءة JSON فورية — SecureStore (webFallback/decryptedCache) ثم localStorage legacy */
function readStorageJsonSync(key: string): unknown {
    try {
        const fromSecure = SecureStoreService.getItemSync(key);
        if (fromSecure) return JSON.parse(fromSecure);
    } catch {
        /* ignore */
    }
    return readLocalStorageJson(key);
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
 * يقرأ من SecureStore sync cache أولاً (مصدر الحفظ الفعلي)، ثم localStorage للتراث.
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

/** مرآة sync للّقطة الفورية — يُستدعى بعد حفظ SecureStore */
export function mirrorCalendarEventsToLocalStorage(payload: string): void {
    if (typeof localStorage === 'undefined') return;
    try {
        const existing = localStorage.getItem(CALENDAR_LOCAL_STORAGE_KEY);
        if (existing === payload) return;
        localStorage.setItem(CALENDAR_LOCAL_STORAGE_KEY, payload);
    } catch {
        /* ignore mirror failures */
    }
}

export function clearCalendarEventsLocalStorageMirror(): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.removeItem(CALENDAR_LOCAL_STORAGE_KEY);
    } catch {
        /* ignore */
    }
}

/** مرآة tombstones للّقطة الفورية — يُستدعى بعد حفظ SecureStore */
export function mirrorCalendarTombstonesToLocalStorage(payload: string): void {
    if (typeof localStorage === 'undefined') return;
    try {
        const existing = localStorage.getItem(LOCAL_TOMBSTONES_KEY);
        if (existing === payload) return;
        localStorage.setItem(LOCAL_TOMBSTONES_KEY, payload);
    } catch {
        /* ignore mirror failures */
    }
}
