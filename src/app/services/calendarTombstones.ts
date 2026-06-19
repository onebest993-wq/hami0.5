/**
 * calendarTombstones — منع "deletion resurrection".
 *
 * المشكلة (قبل هذا الملف):
 *   جهاز A يحذف حدثاً → cloud يفقده.
 *   جهاز B (offline سابقاً) لا يزال يحمله محلياً.
 *   عند مزامنة B → merge يُعيد إحياء الحدث في cloud وفي A.
 *
 * الحلّ:
 *   جدول calendar_tombstones في Supabase يحفظ معرّفات الأحداث المحذوفة.
 *   عند الحذف: نُسجّل tombstone (سحابة + cache محلي).
 *   عند القراءة: نُسقط أي حدث id موجود في tombstones.
 *
 * يعمل مع RLS (auth.uid() = user_id)، لا يحتاج kv-proxy.
 */

import SecureStoreService from '@/app/services/SecureStoreService';
import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { isSupabaseMissingRelationError } from '@/app/utils/supabaseErrors';

const LOCAL_TOMBSTONES_KEY = 'hami:calendar:tombstones:v1';
const CLOUD_DISABLED_STORAGE_KEY = 'hami:calendar:tombstones:cloud-disabled:v1';

interface TombstoneRecord {
    eventId: string;
    deletedAt: string; // ISO
}

interface LocalTombstoneStore {
    [userId: string]: TombstoneRecord[];
}

// ============== Local cache (نسخة احتياطية للأوفلاين) ==============
async function loadLocalTombstones(): Promise<LocalTombstoneStore> {
    try {
        const raw = await SecureStoreService.getItem(LOCAL_TOMBSTONES_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? (parsed as LocalTombstoneStore) : {};
    } catch {
        try {
            const raw = localStorage.getItem(LOCAL_TOMBSTONES_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? (parsed as LocalTombstoneStore) : {};
        } catch {
            return {};
        }
    }
}

async function saveLocalTombstones(store: LocalTombstoneStore): Promise<void> {
    const payload = JSON.stringify(store);
    try {
        await SecureStoreService.setItem(LOCAL_TOMBSTONES_KEY, payload);
    } catch {
        try {
            localStorage.setItem(LOCAL_TOMBSTONES_KEY, payload);
        } catch {
            /* ignore */
        }
    }
}

// ============== In-memory cache (تجنّب network call في كل getEvents) ==============
interface TombstoneCacheEntry {
    set: Set<string>;
    loadedAt: number;
}
const tombstoneCache = new Map<string, TombstoneCacheEntry>();
const TOMBSTONE_CACHE_TTL_MS = 60_000; // 1 دقيقة

/** عند غياب الجدول في Supabase — لا نُعيد طلب REST (يمنع أخطاء 404 في الـ console). */
let cloudTombstonesDisabled = (() => {
    try {
        if (localStorage.getItem(CLOUD_DISABLED_STORAGE_KEY) === '1') return true;
    } catch {
        /* ignore */
    }
    // التطوير: لا نستدعي REST إلا إذا فُعّل صراحة (الجدول غالباً غير منشور بعد)
    if (shouldSkipCloudTombstonesInDev()) {
        return true;
    }
    return false;
})();

function shouldSkipCloudTombstonesInDev(): boolean {
    if (import.meta.env.MODE === 'test') return false;
    return import.meta.env.DEV && import.meta.env.VITE_ENABLE_CALENDAR_TOMBSTONES_CLOUD !== 'true';
}

function isCloudTombstonesSyncEnabled(): boolean {
    if (cloudTombstonesDisabled) return false;
    try {
        if (localStorage.getItem(CLOUD_DISABLED_STORAGE_KEY) === '1') {
            cloudTombstonesDisabled = true;
            return false;
        }
    } catch {
        /* ignore */
    }
    if (shouldSkipCloudTombstonesInDev()) {
        return false;
    }
    return true;
}

function readCache(userId: string): Set<string> | null {
    const entry = tombstoneCache.get(userId);
    if (!entry) return null;
    if (Date.now() - entry.loadedAt > TOMBSTONE_CACHE_TTL_MS) return null;
    return entry.set;
}

function writeCache(userId: string, set: Set<string>): void {
    tombstoneCache.set(userId, { set, loadedAt: Date.now() });
}

function disableCloudTombstones(error: unknown): void {
    if (!isSupabaseMissingRelationError(error)) return;
    cloudTombstonesDisabled = true;
    try {
        localStorage.setItem(CLOUD_DISABLED_STORAGE_KEY, '1');
    } catch {
        /* ignore */
    }
}

/**
 * يُبطل cache الـ tombstones (مفيد بعد restore).
 */
export function invalidateTombstoneCache(userId?: string): void {
    if (userId) tombstoneCache.delete(userId);
    else tombstoneCache.clear();
}

/** للاختبارات فقط */
export function resetCloudTombstoneProbeForTests(): void {
    cloudTombstonesDisabled = false;
    tombstoneCache.clear();
    try {
        localStorage.removeItem(CLOUD_DISABLED_STORAGE_KEY);
    } catch {
        /* ignore */
    }
}

// ============== Public API ==============

/**
 * يُسجّل tombstone للحدث (سحابة + محلي).
 * فشل السحابة لا يُلقي خطأ — الـ tombstone المحلي كافٍ.
 */
export async function recordTombstone(userId: string, eventId: string): Promise<void> {
    if (!userId || !eventId) return;
    const now = new Date().toISOString();

    // إضافة للـ cache فوراً
    const cached = readCache(userId);
    if (cached) {
        cached.add(eventId);
    } else {
        writeCache(userId, new Set([eventId]));
    }

    // local
    try {
        const store = await loadLocalTombstones();
        const list = store[userId] ?? [];
        if (!list.some((t) => t.eventId === eventId)) {
            list.push({ eventId, deletedAt: now });
        }
        store[userId] = list;
        await saveLocalTombstones(store);
    } catch {
        /* ignore */
    }

    // cloud
    if (!isCloudTombstonesSyncEnabled()) return;
    try {
        await SecureAPIClient.fetchSecure('/api/calendar/tombstones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'mark', eventId }),
        });
    } catch (err) {
        disableCloudTombstones(err);
    }
}

/**
 * يجمع كل معرّفات الأحداث المحذوفة (محلية + سحابية، moded into Set).
 * يُستخدم لتصفية getEvents.
 */
let cloudSyncInFlight = false;
async function syncTombstonesFromCloud(userId: string): Promise<void> {
    if (!userId || !isCloudTombstonesSyncEnabled()) return;
    if (cloudSyncInFlight) return;
    cloudSyncInFlight = true;
    try {
        const res = await SecureAPIClient.fetchSecure<{ ok: boolean; eventIds?: string[] }>(
            '/api/calendar/tombstones',
            { method: 'GET' },
        );
        const data = Array.isArray(res?.eventIds)
            ? res.eventIds.map((event_id) => ({ event_id }))
            : [];
        if (!data.length) return;
        const set = readCache(userId) ?? new Set<string>();
        for (const row of data) {
            if (row && typeof row.event_id === 'string') {
                set.add(row.event_id);
            }
        }
        writeCache(userId, set);
    } catch (err) {
        disableCloudTombstones(err);
    } finally {
        cloudSyncInFlight = false;
    }
}

/**
 * يقرأ tombstones من localStorage فقط (سريع، non-blocking).
 * مزامنة سحابية مرة واحدة عند انتهاء صلاحية الـ cache — لا تُكرَّر مع كل getEvents.
 */
export async function loadTombstoneIds(userId: string): Promise<Set<string>> {
    if (!userId) return new Set<string>();

    const cached = readCache(userId);
    if (cached) {
        return cached;
    }

    const set = new Set<string>();
    try {
        const store = await loadLocalTombstones();
        for (const t of store[userId] ?? []) set.add(t.eventId);
    } catch {
        /* ignore */
    }
    writeCache(userId, set);
    void syncTombstonesFromCloud(userId);
    return set;
}

/**
 * يحذف tombstone (مثلاً عند restore عمدي للحدث).
 * يستدعى نادراً.
 */
export async function clearTombstone(userId: string, eventId: string): Promise<void> {
    if (!userId || !eventId) return;
    const cached = readCache(userId);
    if (cached) cached.delete(eventId);
    try {
        const store = await loadLocalTombstones();
        const list = (store[userId] ?? []).filter((t) => t.eventId !== eventId);
        store[userId] = list;
        await saveLocalTombstones(store);
    } catch {
        /* ignore */
    }
    if (!isCloudTombstonesSyncEnabled()) return;
    try {
        await SecureAPIClient.fetchSecure('/api/calendar/tombstones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'clear', eventId }),
        });
    } catch (err) {
        disableCloudTombstones(err);
    }
}
