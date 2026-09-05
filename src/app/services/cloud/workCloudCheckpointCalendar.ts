/**
 * شريحة التقويم داخل نقطة حفظ العمل المشفّرة.
 * ليست KV ولا مسار تقويم على الخادم — الخادم يخزّن ciphertext نقطة العمل فقط.
 */
import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import { isUsableCalendarEventRecord } from '@/app/services/calendar/calendarEventRecord';
import { resolveLiveAuthUserIdForStorage } from '@/app/utils/liveAuthUserId';

export type CalendarCheckpointSlice = {
    events: CalendarEvent[];
    tombstones: Record<string, unknown>;
};

function asEventArray(value: unknown): CalendarEvent[] {
    if (!Array.isArray(value)) return [];
    return value.filter(isUsableCalendarEventRecord);
}

export type CalendarCheckpointRaw = {
    calendar?: unknown;
    calendarTombstones?: unknown;
};

function tombstoneIdsByUser(store: Record<string, unknown>): Map<string, Set<string>> {
    const map = new Map<string, Set<string>>();
    for (const [userId, rows] of Object.entries(store)) {
        if (!userId.trim() || !Array.isArray(rows)) continue;
        const ids = new Set<string>();
        for (const row of rows) {
            if (!row || typeof row !== 'object') continue;
            const eventId = (row as { eventId?: unknown }).eventId;
            if (typeof eventId === 'string' && eventId.trim()) ids.add(eventId);
        }
        map.set(userId, ids);
    }
    return map;
}

export function excludeTombstonedCalendarEvents(
    events: CalendarEvent[],
    tombstones: Record<string, unknown>,
): CalendarEvent[] {
    const tombs = tombstoneIdsByUser(tombstones);
    if (tombs.size === 0) return events;
    return events.filter((event) => !tombs.get(event.userId)?.has(event.id));
}

export function filterCalendarSliceForUser(
    events: CalendarEvent[],
    tombstones: Record<string, unknown>,
    userId: string,
): CalendarCheckpointSlice {
    const uid = userId.trim();
    if (!uid) return { events: [], tombstones: {} };
    const tombsForUser = Object.prototype.hasOwnProperty.call(tombstones, uid)
        ? { [uid]: tombstones[uid] }
        : {};
    return {
        events: events.filter((event) => event.userId === uid),
        tombstones: tombsForUser,
    };
}

function liveUserCalendarSlice(
    events: CalendarEvent[],
    tombstones: Record<string, unknown>,
): CalendarCheckpointSlice {
    return filterCalendarSliceForUser(
        events,
        tombstones,
        String(resolveLiveAuthUserIdForStorage() ?? ''),
    );
}

export function parseCalendarCheckpointSlice(raw: CalendarCheckpointRaw): CalendarCheckpointSlice {
    const tombstones =
        raw.calendarTombstones &&
        typeof raw.calendarTombstones === 'object' &&
        !Array.isArray(raw.calendarTombstones)
            ? (raw.calendarTombstones as Record<string, unknown>)
            : {};
    return {
        events: excludeTombstonedCalendarEvents(asEventArray(raw.calendar), tombstones),
        tombstones,
    };
}

export async function collectCalendarCheckpointSlice(): Promise<CalendarCheckpointSlice> {
    const [{ CalendarDB }, { exportTombstoneStoreForCheckpoint }] = await Promise.all([
        import('@/app/services/cloud/lawyerCalendarCloud'),
        import('@/app/services/calendarTombstones'),
    ]);
    const [events, tombstones] = await Promise.all([
        CalendarDB.getAllStoredEvents(),
        exportTombstoneStoreForCheckpoint(),
    ]);
    const live = excludeTombstonedCalendarEvents(events, tombstones);
    return liveUserCalendarSlice(live, tombstones);
}

async function refreshCalendarSurfaces(userIds: Iterable<string>): Promise<void> {
    const [{ invalidateCalendarEventsCache }, { notifyCalendarUpdated }] = await Promise.all([
        import('@/app/services/calendar/calendarEventsCache'),
        import('@/app/services/calendar/bridge/core'),
    ]);
    const seen = new Set<string>();
    for (const userId of userIds) {
        const id = userId.trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        invalidateCalendarEventsCache(id);
    }
    notifyCalendarUpdated();
}

export async function applyCalendarCheckpointSlice(slice: {
    events: unknown[];
    tombstones: Record<string, unknown>;
}): Promise<number> {
    const scoped = liveUserCalendarSlice(asEventArray(slice.events), slice.tombstones);
    const { mergeTombstoneStoreFromCheckpoint, exportTombstoneStoreForCheckpoint } = await import(
        '@/app/services/calendarTombstones'
    );
    await mergeTombstoneStoreFromCheckpoint(scoped.tombstones);
    const mergedTombs = await exportTombstoneStoreForCheckpoint();
    const events = excludeTombstonedCalendarEvents(scoped.events, mergedTombs);
    const liveId = String(resolveLiveAuthUserIdForStorage() ?? '').trim();
    if (events.length === 0) {
        await refreshCalendarSurfaces(liveId ? [liveId] : Object.keys(scoped.tombstones));
        return 0;
    }
    const { CalendarDB } = await import('@/app/services/cloud/lawyerCalendarCloud');
    await CalendarDB.saveEventsBatch(events);
    await refreshCalendarSurfaces(liveId ? [liveId] : events.map((event) => event.userId));
    return events.length;
}
