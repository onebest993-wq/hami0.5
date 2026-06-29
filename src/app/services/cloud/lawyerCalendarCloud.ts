import SecureStoreService from '@/app/services/SecureStoreService';
import { lawyerCloudKv, fetchPrefixOnceInTick } from '@/app/services/cloud/lawyerCloudKv';
import {
    dedupeCalendarGetEvents,
    invalidateCalendarEventsCache,
} from '@/app/services/calendar/calendarEventsCache';
import { CALENDAR_UPDATED_EVENT } from '@/app/services/calendarBridge.types';
import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';

export type { CalendarEventType, CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';

const CALENDAR_LOCAL_KEY = 'hami:calendar:events:v1';
const CALENDAR_SECURE_READY_MS = 4_000;

function parseCalendarEventsRaw(raw: string | null | undefined): CalendarEvent[] | null {
    if (raw == null) return null;
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed as CalendarEvent[];
    } catch {
        return null;
    }
}

/** قراءة فورية — localStorage mirror ثم SecureStore sync cache */
function readCalendarEventsFromMirrors(): CalendarEvent[] | null {
    if (typeof localStorage !== 'undefined') {
        try {
            const lsKey = localStorage.getItem(CALENDAR_LOCAL_KEY);
            if (lsKey !== null) {
                return parseCalendarEventsRaw(lsKey) ?? [];
            }
        } catch {
            /* fall through */
        }
    }
    try {
        const syncRaw = SecureStoreService.getItemSync(CALENDAR_LOCAL_KEY);
        if (syncRaw != null) {
            return parseCalendarEventsRaw(syncRaw) ?? [];
        }
    } catch {
        /* fall through */
    }
    return null;
}

async function loadLocalCalendarEvents(): Promise<CalendarEvent[]> {
    const mirrored = readCalendarEventsFromMirrors();
    if (mirrored !== null) return mirrored;

    try {
        await Promise.race([
            SecureStoreService.ensurePersistedReady(),
            new Promise<void>((resolve) => setTimeout(resolve, CALENDAR_SECURE_READY_MS)),
        ]);
        const syncRaw = SecureStoreService.getItemSync(CALENDAR_LOCAL_KEY);
        const fromSync = parseCalendarEventsRaw(syncRaw);
        if (fromSync !== null) return fromSync;
        const raw = await SecureStoreService.getItem(CALENDAR_LOCAL_KEY);
        return parseCalendarEventsRaw(raw) ?? [];
    } catch {
        return readCalendarEventsFromMirrors() ?? [];
    }
}

type CalendarPersistMode = 'normal' | 'replace';

function notifyCalendarUpdated(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(CALENDAR_UPDATED_EVENT));
}

async function persistCalendarEventsToSecureStore(payload: string): Promise<void> {
    try {
        await Promise.race([
            SecureStoreService.ensurePersistedReady(),
            new Promise<void>((resolve) => setTimeout(resolve, CALENDAR_SECURE_READY_MS)),
        ]);
        const existing = await SecureStoreService.getItem(CALENDAR_LOCAL_KEY);
        if (existing === payload) return;
        await SecureStoreService.setItem(CALENDAR_LOCAL_KEY, payload);
    } catch {
        /* localStorage mirror already written — UX path complete */
    }
}

async function saveLocalCalendarEvents(
    events: CalendarEvent[],
    mode: CalendarPersistMode = 'normal',
): Promise<void> {
    const { mirrorCalendarEventsToLocalStorage, clearCalendarEventsLocalStorageMirror } = await import(
        '@/app/services/calendar/calendarLocalSnapshot'
    );

    if (events.length === 0) {
        if (mode !== 'replace') return;
        clearCalendarEventsLocalStorageMirror();
        notifyCalendarUpdated();
        void SecureStoreService.deleteItem(CALENDAR_LOCAL_KEY).catch(() => undefined);
        return;
    }

    const payload = JSON.stringify(events);
    mirrorCalendarEventsToLocalStorage(payload);
    notifyCalendarUpdated();
    void persistCalendarEventsToSecureStore(payload);
}

function mergeCalendarEvents(local: CalendarEvent[], remote: CalendarEvent[]): CalendarEvent[] {
    const map = new Map<string, CalendarEvent>();
    for (const e of local) map.set(e.id, e);
    for (const e of remote) {
        const prev = map.get(e.id);
        if (!prev) {
            map.set(e.id, e);
            continue;
        }
        const prevTime = Number.isFinite(Date.parse(prev.updatedAt)) ? Date.parse(prev.updatedAt) : 0;
        const nextTime = Number.isFinite(Date.parse(e.updatedAt)) ? Date.parse(e.updatedAt) : 0;
        map.set(e.id, nextTime > prevTime ? e : prev);
    }
    return Array.from(map.values());
}

async function fetchCalendarEventsForUser(userId: string): Promise<CalendarEvent[]> {
    const tombstonesPromise = (async (): Promise<Set<string>> => {
        try {
            const m = await import('@/app/services/calendarTombstones');
            return await m.loadTombstoneIds(userId);
        } catch {
            return new Set<string>();
        }
    })();
    const [local, tombstones] = await Promise.all([loadLocalCalendarEvents(), tombstonesPromise]);
    const userLocal = local.filter((e) => e.userId === userId && !tombstones.has(e.id));

    try {
        const res = await fetchPrefixOnceInTick(`calendar:${userId}:`);
        const remote = res.filter((e): e is CalendarEvent => {
            if (!e || typeof e !== 'object') return false;
            const o = e as Record<string, unknown>;
            if (typeof o.id !== 'string' || typeof o.title !== 'string') return false;
            return !tombstones.has(o.id);
        });
        const mergedForUser = mergeCalendarEvents(userLocal, remote).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        const others = local.filter((e) => e.userId !== userId);
        const fullLocal = mergeCalendarEvents(others, mergedForUser);
        await saveLocalCalendarEvents(fullLocal);
        return mergedForUser;
    } catch {
        return userLocal.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
    }
}

export const CalendarDB = {
    async getAllStoredEvents(): Promise<CalendarEvent[]> {
        return loadLocalCalendarEvents();
    },

    async getEvents(userId: string, options?: { forceRefresh?: boolean }): Promise<CalendarEvent[]> {
        if (!userId?.trim()) return [];
        return dedupeCalendarGetEvents(userId, () => fetchCalendarEventsForUser(userId), options);
    },

    async saveEvent(event: CalendarEvent): Promise<void> {
        if (!event.userId) throw new Error('userId مطلوب لحفظ الموعد');
        const local = await loadLocalCalendarEvents();
        const merged = mergeCalendarEvents(local, [event]);
        try {
            await lawyerCloudKv.set(`calendar:${event.userId}:${event.id}`, event);
        } catch {
            // Cloud-First
        }
        await saveLocalCalendarEvents(merged);
        invalidateCalendarEventsCache(event.userId);
    },

    async saveEventsBatch(events: CalendarEvent[]): Promise<void> {
        if (!Array.isArray(events) || events.length === 0) return;
        const valid = events.filter((e) => e && typeof e.userId === 'string' && e.userId);
        if (valid.length === 0) return;

        const local = await loadLocalCalendarEvents();
        const merged = mergeCalendarEvents(local, valid);
        await saveLocalCalendarEvents(merged);

        await Promise.allSettled(valid.map((e) => lawyerCloudKv.set(`calendar:${e.userId}:${e.id}`, e)));
        for (const e of valid) invalidateCalendarEventsCache(e.userId);
    },

    async deleteEvent(eventId: string, userId: string): Promise<void> {
        if (!eventId || !userId) throw new Error('معرف الموعد والمستخدم مطلوب');

        try {
            const tomb = await import('@/app/services/calendarTombstones');
            await tomb.recordTombstone(userId, eventId);
        } catch {
            /* غير حاسم */
        }

        try {
            await lawyerCloudKv.del(`calendar:${userId}:${eventId}`);
        } catch {
            // Cloud-First
        }
        const local = await loadLocalCalendarEvents();
        if (!local.some((e) => e.id === eventId)) return;
        const next = local.filter((e) => e.id !== eventId);
        await saveLocalCalendarEvents(next, 'replace');
        invalidateCalendarEventsCache(userId);
    },

    async updateEvent(event: CalendarEvent): Promise<void> {
        await this.saveEvent(event);
    },
};
