/**
 * CalendarDB — جدول المواعيد على الجهاز فقط (SecureStore مشفّر).
 * لا شبكة ولا KV. مواعيد الإضبارة تُبنى محلياً عبر dossierSync.
 * اسم الملف ومسار calendarCloudLoader→Runtime يبقيان hop مزدوجاً عمداً (صدق melt/الجذع).
 */
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    dedupeCalendarGetEvents,
    invalidateCalendarEventsCache,
} from '@/app/services/calendar/calendarEventsCache';
import { notifyCalendarUpdated } from '@/app/services/calendar/bridge/core';
import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import { isUsableCalendarEventRecord } from '@/app/services/calendar/calendarEventRecord';
import { CALENDAR_EVENTS_STORAGE_KEY as CALENDAR_LOCAL_KEY } from '@/app/services/calendar/calendarStorageKeys';
import {
    persistSecurePayloadWhenReady,
    readSecureOrDrainLegacySync,
    readSecurePayloadWhenReady,
} from '@/app/services/storage/readSecureOrDrainLegacySync';

export type { CalendarEventType, CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';

function loadCalendarLocalSnapshot() {
    return import('@/app/services/calendar/calendarLocalSnapshot');
}

function parseCalendarEventsRaw(raw: string | null | undefined): CalendarEvent[] | null {
    if (raw == null) return null;
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(isUsableCalendarEventRecord);
    } catch {
        return null;
    }
}

/** قراءة فورية — SecureStore ثم ترحيل مرآة localStorage القديمة */
function readCalendarEventsFromMirrors(): CalendarEvent[] | null {
    const raw = readSecureOrDrainLegacySync(CALENDAR_LOCAL_KEY);
    if (raw == null) return null;
    return parseCalendarEventsRaw(raw);
}

async function loadLocalCalendarEvents(): Promise<CalendarEvent[]> {
    const mirrored = readCalendarEventsFromMirrors();
    if (mirrored !== null) return mirrored;

    try {
        const raw = await readSecurePayloadWhenReady(CALENDAR_LOCAL_KEY);
        return parseCalendarEventsRaw(raw) ?? [];
    } catch {
        return readCalendarEventsFromMirrors() ?? [];
    }
}

type CalendarPersistMode = 'normal' | 'replace';

type SaveLocalOptions = {
    mode?: CalendarPersistMode;
    /** لا يُطلق CALENDAR_UPDATED — لمسار القراءة/الدمج فقط */
    silent?: boolean;
};

async function persistCalendarEventsToSecureStore(payload: string): Promise<void> {
    try {
        await persistSecurePayloadWhenReady(CALENDAR_LOCAL_KEY, payload);
    } catch {
        /* setItemSync يملأ الكاش إن نجح — مسار العرض لا ينتظر IDB */
    }
}

async function saveLocalCalendarEvents(
    events: CalendarEvent[],
    options?: SaveLocalOptions,
): Promise<void> {
    const mode = options?.mode ?? 'normal';
    const silent = options?.silent ?? false;
    const snapshot = await loadCalendarLocalSnapshot();

    if (events.length === 0) {
        if (mode !== 'replace') return;
        snapshot.clearCalendarEventsLocalStorageMirror();
        if (!silent) notifyCalendarUpdated();
        await SecureStoreService.deleteItem(CALENDAR_LOCAL_KEY).catch(() => undefined);
        return;
    }

    const payload = JSON.stringify(events);
    try {
        SecureStoreService.setItemSync(CALENDAR_LOCAL_KEY, payload);
    } catch {
        /* الحارس قد يرفض — persist يقرر */
    }
    if (!silent) notifyCalendarUpdated();
    await persistCalendarEventsToSecureStore(payload);
    snapshot.clearCalendarEventsLocalStorageMirror();
}

function mergeCalendarEvents(local: CalendarEvent[], incoming: CalendarEvent[]): CalendarEvent[] {
    const map = new Map<string, CalendarEvent>();
    for (const e of local) map.set(e.id, e);
    for (const e of incoming) {
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

function createdAtMs(event: CalendarEvent): number {
    const ms = Date.parse(event.createdAt);
    return Number.isFinite(ms) ? ms : 0;
}

function sortEventsNewestFirst(events: CalendarEvent[]): CalendarEvent[] {
    return events.sort((a, b) => createdAtMs(b) - createdAtMs(a));
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
    return sortEventsNewestFirst(
        local.filter((e) => e.userId === userId && !tombstones.has(e.id)),
    );
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
        if (!event.userId) throw new Error('[calendar:cloud:save_missing_userid] userId مطلوب لحفظ الموعد');
        const mirrored = readCalendarEventsFromMirrors();
        let local: CalendarEvent[];
        if (mirrored !== null) {
            local = mirrored;
        } else if (
            typeof localStorage !== 'undefined' &&
            localStorage.getItem(CALENDAR_LOCAL_KEY) === null
        ) {
            local = [];
        } else {
            local = await loadLocalCalendarEvents();
        }
        const merged = mergeCalendarEvents(local, [event]);
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

        for (const e of valid) invalidateCalendarEventsCache(e.userId);
    },

    async deleteEvent(eventId: string, userId: string): Promise<void> {
        if (!eventId || !userId) throw new Error('[calendar:cloud:delete_missing_ids] معرف الموعد والمستخدم مطلوب');

        try {
            const tomb = await import('@/app/services/calendarTombstones');
            await tomb.recordTombstone(userId, eventId);
        } catch {
            /* غير حاسم */
        }

        const local = await loadLocalCalendarEvents();
        if (!local.some((e) => e.id === eventId)) {
            invalidateCalendarEventsCache(userId);
            return;
        }
        const next = local.filter((e) => e.id !== eventId);
        await saveLocalCalendarEvents(next, { mode: 'replace' });
        invalidateCalendarEventsCache(userId);
    },

    async updateEvent(event: CalendarEvent): Promise<void> {
        await this.saveEvent(event);
    },
};
