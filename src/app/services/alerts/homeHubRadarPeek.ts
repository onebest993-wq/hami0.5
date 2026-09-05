import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';

let warmed: { lawyerId: string; events: CalendarEvent[] } | null = null;
const warmListeners = new Set<() => void>();

export function emitHomeHubRadarWarm(): void {
    for (const listener of warmListeners) listener();
}

export function subscribeHomeHubRadarWarm(listener: () => void): () => void {
    warmListeners.add(listener);
    return () => {
        warmListeners.delete(listener);
    };
}

export function peekHomeHubRadarCache(lawyerId: string | null): CalendarEvent[] | null {
    if (!lawyerId || !warmed || warmed.lawyerId !== lawyerId) return null;
    return warmed.events;
}

export function setHomeHubRadarPeek(lawyerId: string, events: CalendarEvent[]): void {
    warmed = { lawyerId, events };
}

export function clearHomeHubRadarPeek(lawyerId: string): void {
    if (warmed?.lawyerId === lawyerId) warmed = null;
}

export function resetHomeHubRadarPeekForTests(): void {
    warmed = null;
    warmListeners.clear();
}
