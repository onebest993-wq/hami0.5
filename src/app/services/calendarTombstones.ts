/**
 * شواهد حذف محلية — تمنع إحياء موعد محذوف عند إعادة بناء الجدول من الإضبارة.
 * لا /api ولا KV.
 */

import SecureStoreService from '@/app/services/SecureStoreService';
import { CALENDAR_TOMBSTONES_STORAGE_KEY } from '@/app/services/calendar/calendarStorageKeys';
import {
    clearLegacyPlaintextMirror,
    readSecureOrDrainLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';

interface TombstoneRecord {
    eventId: string;
    deletedAt: string;
}

interface LocalTombstoneStore {
    [userId: string]: TombstoneRecord[];
}

function parseLocalTombstoneStore(raw: string | null): LocalTombstoneStore {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? (parsed as LocalTombstoneStore) : {};
    } catch {
        return {};
    }
}

async function loadLocalTombstones(): Promise<LocalTombstoneStore> {
    try {
        const raw = await SecureStoreService.getItem(CALENDAR_TOMBSTONES_STORAGE_KEY);
        if (raw) {
            clearLegacyPlaintextMirror(CALENDAR_TOMBSTONES_STORAGE_KEY);
            return parseLocalTombstoneStore(raw);
        }
    } catch {
        /* fall through — ترحيل المرآة */
    }
    try {
        return parseLocalTombstoneStore(readSecureOrDrainLegacySync(CALENDAR_TOMBSTONES_STORAGE_KEY));
    } catch {
        return {};
    }
}

async function saveLocalTombstones(store: LocalTombstoneStore): Promise<void> {
    const payload = JSON.stringify(store);
    try {
        await SecureStoreService.setItem(CALENDAR_TOMBSTONES_STORAGE_KEY, payload);
        clearLegacyPlaintextMirror(CALENDAR_TOMBSTONES_STORAGE_KEY);
        return;
    } catch {
        /* setItemSync يملأ الكاش إن نجح — لا مرآة صريحة */
    }
    try {
        SecureStoreService.setItemSync(CALENDAR_TOMBSTONES_STORAGE_KEY, payload);
        clearLegacyPlaintextMirror(CALENDAR_TOMBSTONES_STORAGE_KEY);
    } catch {
        /* الجلسة تحتفظ بالكاش في الذاكرة */
    }
}

const tombstoneCache = new Map<string, Set<string>>();

function readCache(userId: string): Set<string> | null {
    return tombstoneCache.get(userId) ?? null;
}

function writeCache(userId: string, set: Set<string>): void {
    tombstoneCache.set(userId, set);
}

export function invalidateTombstoneCache(userId?: string): void {
    if (userId) tombstoneCache.delete(userId);
    else tombstoneCache.clear();
}

/** للاختبارات فقط */
export function resetTombstoneStateForTests(): void {
    invalidateTombstoneCache();
}

export async function recordTombstone(userId: string, eventId: string): Promise<void> {
    if (!userId || !eventId) return;
    const now = new Date().toISOString();

    const cached = readCache(userId);
    if (cached) {
        cached.add(eventId);
    } else {
        writeCache(userId, new Set([eventId]));
    }

    try {
        const store = await loadLocalTombstones();
        const list = store[userId] ?? [];
        if (!list.some((t) => t.eventId === eventId)) {
            list.push({ eventId, deletedAt: now });
        }
        store[userId] = list;
        await saveLocalTombstones(store);
    } catch {
        /* الكاش يكفي لهذه الجلسة */
    }
}

export async function loadTombstoneIds(userId: string): Promise<Set<string>> {
    if (!userId) return new Set<string>();

    const cached = readCache(userId);
    if (cached) return cached;

    const set = new Set<string>();
    try {
        const store = await loadLocalTombstones();
        for (const t of store[userId] ?? []) set.add(t.eventId);
    } catch {
        /* ignore */
    }
    writeCache(userId, set);
    return set;
}

export type CalendarTombstoneStore = LocalTombstoneStore;

export async function exportTombstoneStoreForCheckpoint(): Promise<CalendarTombstoneStore> {
    return loadLocalTombstones();
}

function isTombstoneRecord(value: unknown): value is TombstoneRecord {
    if (!value || typeof value !== 'object') return false;
    const row = value as Record<string, unknown>;
    return typeof row.eventId === 'string' && row.eventId.trim().length > 0;
}

/** دمج شواهد الحذف من نقطة الحفظ المشفّرة — اتحاد بالمعرّف، بلا KV. */
export async function mergeTombstoneStoreFromCheckpoint(incoming: unknown): Promise<number> {
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return 0;
    const incomingStore = incoming as Record<string, unknown>;
    const local = await loadLocalTombstones();
    let added = 0;
    for (const [userId, rows] of Object.entries(incomingStore)) {
        if (!userId.trim() || !Array.isArray(rows)) continue;
        const list = local[userId] ?? [];
        const seen = new Set(list.map((t) => t.eventId));
        for (const row of rows) {
            if (!isTombstoneRecord(row) || seen.has(row.eventId)) continue;
            list.push({
                eventId: row.eventId,
                deletedAt: typeof row.deletedAt === 'string' ? row.deletedAt : new Date().toISOString(),
            });
            seen.add(row.eventId);
            added += 1;
        }
        local[userId] = list;
        writeCache(userId, seen);
    }
    if (added > 0) await saveLocalTombstones(local);
    return added;
}

export async function clearTombstone(userId: string, eventId: string): Promise<void> {
    if (!userId || !eventId) return;
    const cached = readCache(userId);
    if (cached) cached.delete(eventId);
    try {
        const store = await loadLocalTombstones();
        store[userId] = (store[userId] ?? []).filter((t) => t.eventId !== eventId);
        await saveLocalTombstones(store);
    } catch {
        /* ignore */
    }
}
