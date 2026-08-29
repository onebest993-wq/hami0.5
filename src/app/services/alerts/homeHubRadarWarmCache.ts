import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import { fetchCalendarEvents } from '@/app/services/calendar/calendarCloudRuntime';
import {
    getCachedCalendarEvents,
    hasCachedCalendarEvents,
} from '@/app/services/calendar/calendarEventsCache';

let warmed: { lawyerId: string; events: CalendarEvent[] } | null = null;
let warmPromise: Promise<CalendarEvent[]> | null = null;
let warmLawyerId: string | null = null;
/** يرتفع عند إبطال نفس المحامي أثناء جلب — الرد القديم يُتجاهل. */
let warmEpoch = 0;
/**
 * بعد hami:calendar-updated لا نثق بذاكرة التقويم القديمة (خصوصاً []).
 * تُرفع حتى تكتمل لقطة الهاب الجديدة.
 */
let calendarFallbackBlockedFor: string | null = null;
const warmListeners = new Set<() => void>();

function emitHomeHubRadarWarm(): void {
    for (const listener of warmListeners) listener();
}

export function subscribeHomeHubRadarWarm(listener: () => void): () => void {
    warmListeners.add(listener);
    return () => {
        warmListeners.delete(listener);
    };
}

export function isHomeHubRadarWarmInFlight(lawyerId: string | null): boolean {
    if (!lawyerId) return false;
    if (warmLawyerId !== lawyerId || !warmPromise) return false;
    return peekHomeHubRadarCache(lawyerId) === null;
}

export function warmHomeHubRadarCache(lawyerId: string | null): void {
    if (!lawyerId) return;
    if (warmLawyerId === lawyerId && warmPromise) return;
    const epoch = warmEpoch;
    warmLawyerId = lawyerId;
    warmPromise = fetchCalendarEvents(lawyerId)
        .then((list) => {
            if (epoch !== warmEpoch || warmLawyerId !== lawyerId) return Array.isArray(list) ? list : [];
            const events = Array.isArray(list) ? list : [];
            warmed = { lawyerId, events };
            if (calendarFallbackBlockedFor === lawyerId) calendarFallbackBlockedFor = null;
            emitHomeHubRadarWarm();
            return events;
        })
        .catch(() => {
            if (epoch !== warmEpoch || warmLawyerId !== lawyerId) return [];
            warmed = { lawyerId, events: [] };
            if (calendarFallbackBlockedFor === lawyerId) calendarFallbackBlockedFor = null;
            emitHomeHubRadarWarm();
            return [];
        });
}

export function peekHomeHubRadarCache(lawyerId: string | null): CalendarEvent[] | null {
    if (!lawyerId || !warmed || warmed.lawyerId !== lawyerId) return null;
    return warmed.events;
}

/**
 * لقطة هذا الجلسة: كاش الهاب، وإلا ذاكرة التقويم إن اكتمل جلب سابق ولم يُبطَل المصدر.
 * null = لم يُؤكَّد بعد.
 */
export function peekHomeHubRadarSnapshot(lawyerId: string | null): readonly unknown[] | null {
    const hub = peekHomeHubRadarCache(lawyerId);
    if (hub !== null) return hub;
    if (!lawyerId || calendarFallbackBlockedFor === lawyerId) return null;
    if (!hasCachedCalendarEvents(lawyerId)) return null;
    return getCachedCalendarEvents(lawyerId);
}

/** يُبطل لقطة هذا المحامي حتى يُعاد الاكتشاف بعد تحديث التقويم. */
export function invalidateHomeHubRadarCache(lawyerId: string | null): void {
    if (!lawyerId) return;
    calendarFallbackBlockedFor = lawyerId;
    if (warmed?.lawyerId === lawyerId) warmed = null;
    if (warmLawyerId === lawyerId) {
        warmEpoch += 1;
        warmPromise = null;
        warmLawyerId = null;
    }
    emitHomeHubRadarWarm();
}

export function resetHomeHubRadarCacheForTests(): void {
    warmed = null;
    warmPromise = null;
    warmLawyerId = null;
    warmEpoch = 0;
    calendarFallbackBlockedFor = null;
    warmListeners.clear();
}

/** للاختبارات — حقن كاش متزامن */
export function setHomeHubRadarCacheForTests(lawyerId: string, events: CalendarEvent[]): void {
    warmed = { lawyerId, events };
    warmLawyerId = lawyerId;
    warmPromise = Promise.resolve(events);
    if (calendarFallbackBlockedFor === lawyerId) calendarFallbackBlockedFor = null;
    emitHomeHubRadarWarm();
}
