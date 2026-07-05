import type { CalendarEvent } from '@/app/services/calendar/calendarTypes';

type CacheEntry = {
    events: CalendarEvent[];
    contentSig: string;
};

const memoryByUser = new Map<string, CacheEntry>();
const inFlightByUser = new Map<string, Promise<CalendarEvent[]>>();

function eventsSignature(events: CalendarEvent[]): string {
    if (events.length === 0) return '0';
    const parts: string[] = [`n:${events.length}`];
    for (const e of events) {
        parts.push(`${e.id}:${e.updatedAt ?? ''}:${e.date ?? ''}`);
    }
    return parts.join('|');
}

export function getCachedCalendarEvents(userId: string): CalendarEvent[] | null {
    if (!userId) return null;
    const entry = memoryByUser.get(userId);
    if (!entry) return null;
    return entry.events;
}

/** هل وُجدت لقطة ذاكرة (حتى لو فارغة بعد جلب سابق)؟ */
export function hasCachedCalendarEvents(userId: string): boolean {
    if (!userId) return false;
    return memoryByUser.has(userId);
}

export function setCachedCalendarEvents(userId: string, events: CalendarEvent[]): void {
    if (!userId) return;
    memoryByUser.set(userId, {
        events,
        contentSig: eventsSignature(events),
    });
}

export function invalidateCalendarEventsCache(userId?: string): void {
    if (userId) {
        memoryByUser.delete(userId);
        inFlightByUser.delete(userId);
        return;
    }
    memoryByUser.clear();
    inFlightByUser.clear();
}

/**
 * يُجمّع طلبات getEvents المتزامنة لنفس المحامي في promise واحد.
 * يُستخدم من CalendarDB.getEvents.
 */
export function dedupeCalendarGetEvents(
    userId: string,
    fetcher: () => Promise<CalendarEvent[]>,
    options?: { forceRefresh?: boolean },
): Promise<CalendarEvent[]> {
    if (!userId) return fetcher();

    if (!options?.forceRefresh) {
        const cached = getCachedCalendarEvents(userId);
        if (cached) return Promise.resolve(cached);

        const inflight = inFlightByUser.get(userId);
        if (inflight) return inflight;
    } else {
        invalidateCalendarEventsCache(userId);
    }

    const promise = fetcher()
        .then((events) => {
            setCachedCalendarEvents(userId, events);
            return events;
        })
        .finally(() => {
            if (inFlightByUser.get(userId) === promise) {
                inFlightByUser.delete(userId);
            }
        });

    inFlightByUser.set(userId, promise);
    return promise;
}

/** للاختبارات */
export function resetCalendarEventsCacheForTests(): void {
    invalidateCalendarEventsCache();
}
