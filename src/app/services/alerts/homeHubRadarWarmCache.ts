import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import { fetchCalendarEvents } from '@/app/services/calendar/calendarCloudLoader';

let warmed: { lawyerId: string; events: CalendarEvent[] } | null = null;
let warmPromise: Promise<CalendarEvent[]> | null = null;
let warmLawyerId: string | null = null;

export function warmHomeHubRadarCache(lawyerId: string | null): void {
    if (!lawyerId) return;
    if (warmLawyerId === lawyerId && warmPromise) return;
    warmLawyerId = lawyerId;
    warmPromise = fetchCalendarEvents(lawyerId)
        .then((list) => {
            const events = Array.isArray(list) ? list : [];
            warmed = { lawyerId, events };
            return events;
        })
        .catch(() => {
            warmed = { lawyerId, events: [] };
            return [];
        });
}

export function peekHomeHubRadarCache(lawyerId: string | null): CalendarEvent[] | null {
    if (!lawyerId || !warmed || warmed.lawyerId !== lawyerId) return null;
    return warmed.events;
}

export async function readHomeHubRadarCache(lawyerId: string | null): Promise<CalendarEvent[]> {
    if (!lawyerId) return [];
    const peeked = peekHomeHubRadarCache(lawyerId);
    if (peeked) return peeked;
    warmHomeHubRadarCache(lawyerId);
    return warmPromise ?? Promise.resolve([]);
}

export function resetHomeHubRadarCacheForTests(): void {
    warmed = null;
    warmPromise = null;
    warmLawyerId = null;
}

/** للاختبارات — حقن كاش متزامن */
export function setHomeHubRadarCacheForTests(lawyerId: string, events: CalendarEvent[]): void {
    warmed = { lawyerId, events };
    warmLawyerId = lawyerId;
    warmPromise = Promise.resolve(events);
}
