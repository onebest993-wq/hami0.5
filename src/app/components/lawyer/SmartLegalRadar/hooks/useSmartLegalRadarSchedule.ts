import { useEffect, useMemo, useState } from 'react';
import { buildEventsByDateIndex } from '@/app/components/lawyer/hooks/useCalendarData';
import { monthGridMetrics, timeValue } from '../radarCalendarMath';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import { resolveHighlightUnifiedEventId } from '@/app/components/lawyer/SmartLegalRadar/calendarFocusIds';

type RadarViewSlice = {
    viewYear: number;
    viewMonth: number;
    selectedDate: string;
};

export function useSmartLegalRadarSchedule(
    allEvents: UnifiedEvent[],
    getEventsForDate: (d: Date) => UnifiedEvent[],
    view: RadarViewSlice,
    initialEventId?: string,
) {
    const resolvedHighlightId = useMemo(
        () => resolveHighlightUnifiedEventId(allEvents, initialEventId),
        [allEvents, initialEventId],
    );
    const [highlightEventId, setHighlightEventId] = useState<string | undefined>(resolvedHighlightId);

    useEffect(() => {
        if (!initialEventId) {
            setHighlightEventId(undefined);
            return;
        }
        if (resolvedHighlightId) setHighlightEventId(resolvedHighlightId);
    }, [initialEventId, resolvedHighlightId]);

    useEffect(() => {
        if (!highlightEventId) return;
        const t = window.setTimeout(() => setHighlightEventId(undefined), 8000);
        return () => window.clearTimeout(t);
    }, [highlightEventId]);

    const { daysInMonth, firstDayOfMonth } = useMemo(
        () => monthGridMetrics(view.viewYear, view.viewMonth),
        [view.viewYear, view.viewMonth],
    );

    const eventsByDateForMonth = useMemo(
        () => buildEventsByDateIndex(allEvents, view.viewYear, view.viewMonth),
        [view.viewYear, view.viewMonth, allEvents],
    );

    const selectedEvents = useMemo(() => {
        if (!view.selectedDate) return [];
        const d = new Date(`${view.selectedDate}T12:00:00`);
        if (Number.isNaN(d.getTime())) return [];
        return getEventsForDate(d).sort((a, b) => timeValue(a.time) - timeValue(b.time));
    }, [getEventsForDate, view.selectedDate]);

    const datesWithEvents = useMemo(() => {
        const next = new Set<string>();
        for (const event of allEvents) {
            if (event.date) next.add(event.date.slice(0, 10));
        }
        return next;
    }, [allEvents]);

    return {
        highlightEventId,
        daysInMonth,
        firstDayOfMonth,
        eventsByDateForMonth,
        selectedEvents,
        datesWithEvents,
    };
}
