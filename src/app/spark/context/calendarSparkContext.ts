import type { CalendarEventType } from '@/app/services/cloud/lawyerCalendarTypes';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import {
    scanCalendarConflictDays,
    type CalendarSparkConflictDay,
} from '@/app/spark/engine/calendarConflictSparkBridge';

export type { CalendarSparkConflictDay };

export type CalendarSparkEventRef = {
    eventId: string;
    title: string;
    date: string;
    time?: string;
    type: CalendarEventType;
    source: UnifiedEvent['source'];
    caseNo?: string;
    isBridged: boolean;
    court?: string;
    location?: string;
    isCompleted?: boolean;
    startsAtMs: number;
    hoursUntil: number;
};

export type CalendarSparkContext = {
    dossierKey: string;
    nowMs: number;
    upcoming: CalendarSparkEventRef[];
    conflictDays: CalendarSparkConflictDay[];
    allEvents: UnifiedEvent[];
};

function parseEventStartMs(date: string, time?: string): number {
    const iso = `${date}T${time?.trim() ? time.trim() : '09:00'}`;
    const ms = Date.parse(iso);
    return Number.isFinite(ms) ? ms : Number.NaN;
}

function toEventRef(event: UnifiedEvent, nowMs: number): CalendarSparkEventRef | null {
    const startsAtMs = parseEventStartMs(event.date, event.time);
    if (!Number.isFinite(startsAtMs) || startsAtMs <= nowMs) return null;

    const hoursUntil = (startsAtMs - nowMs) / (1000 * 60 * 60);

    return {
        eventId: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        type: event.type,
        source: event.source,
        caseNo: event.caseNo,
        isBridged: Boolean(event.isBridged && event.bridge?.sourceEntityId),
        court: event.court,
        location: event.location,
        isCompleted: event.isCompleted,
        startsAtMs,
        hoursUntil,
    };
}

export function buildCalendarSparkContext(
    events: UnifiedEvent[],
    options?: { nowMs?: number; horizonHours?: number; conflictHorizonDays?: number },
): CalendarSparkContext {
    const nowMs = options?.nowMs ?? Date.now();
    const horizonHours = options?.horizonHours ?? 48;
    const conflictHorizonDays = options?.conflictHorizonDays ?? 7;

    const upcoming = events
        .filter((event) => !event.isCompleted)
        .map((event) => toEventRef(event, nowMs))
        .filter((ref): ref is CalendarSparkEventRef => ref !== null && ref.hoursUntil <= horizonHours)
        .sort((a, b) => a.startsAtMs - b.startsAtMs);

    const conflictDays = scanCalendarConflictDays(events, { nowMs, horizonDays: conflictHorizonDays });

    const first = upcoming[0];
    const dossierKey = first
        ? `calendar:${first.eventId}`
        : conflictDays[0]
          ? `calendar:day:${conflictDays[0].dateYmd}`
          : 'calendar:empty';

    return { dossierKey, nowMs, upcoming, conflictDays, allEvents: events };
}
