import { useState, useCallback, useEffect } from 'react';
import {
    peekCalendarShellSession,
    patchCalendarShellSession,
    seedCalendarShellSession,
    subscribeCalendarShellSession,
    type CalendarShellSession,
} from '@/app/services/calendar/calendarShellSession';
import { viewFromCalendarYmd } from '@/app/services/calendar/calendarMonthMath';
import {
    selectedDateAfterMonthShift,
    todayYmd,
} from '@/app/components/lawyer/SmartLegalRadar/radarCalendarMath';

const RADAR_ZONE_MARK_PREFIX = 'hami:calendar:zone:';

function latestRadarZoneMark(name: string): PerformanceEntry | null {
    if (typeof performance === 'undefined' || typeof performance.getEntriesByName !== 'function') return null;
    const entries = performance.getEntriesByName(name, 'mark');
    return entries.length > 0 ? entries[entries.length - 1] : null;
}

export function markRadarZoneSwitch(zone: string): void {
    if (typeof performance === 'undefined' || typeof performance.mark !== 'function') return;
    try {
        performance.mark(`${RADAR_ZONE_MARK_PREFIX}${zone}`);
    } catch {
        /* ignore */
    }
}

export function getRadarZoneSwitchMs(fromZone: string, toZone: string): number | null {
    if (typeof performance === 'undefined') return null;
    const from = latestRadarZoneMark(`${RADAR_ZONE_MARK_PREFIX}${fromZone}`);
    const to = latestRadarZoneMark(`${RADAR_ZONE_MARK_PREFIX}${toZone}`);
    if (!from || !to) return null;
    const delta = to.startTime - from.startTime;
    if (delta < 0) return null;
    return Math.round(delta);
}

function sessionSeed(initialDate?: string): CalendarShellSession {
    const existing = peekCalendarShellSession();
    if (existing) return existing;
    if (initialDate) {
        const view = viewFromCalendarYmd(initialDate);
        if (view) {
            return patchCalendarShellSession({ ...view, showFullMonth: false });
        }
    }
    return seedCalendarShellSession();
}

export function useSmartLegalRadarView(initialDate?: string) {
    const seeded = sessionSeed(initialDate);
    const [viewYear, setViewYear] = useState(seeded.viewYear);
    const [viewMonth, setViewMonth] = useState(seeded.viewMonth);
    const [selectedDate, setSelectedDate] = useState<string>(seeded.selectedDate);
    const [showFullMonth, setShowFullMonth] = useState(seeded.showFullMonth);

    const commit = useCallback((next: CalendarShellSession) => {
        setViewYear(next.viewYear);
        setViewMonth(next.viewMonth);
        setSelectedDate(next.selectedDate);
        setShowFullMonth(next.showFullMonth);
    }, []);

    useEffect(() => {
        if (!initialDate) return;
        const view = viewFromCalendarYmd(initialDate);
        if (!view) return;
        commit(patchCalendarShellSession(view));
    }, [commit, initialDate]);

    useEffect(() => {
        commit(peekCalendarShellSession() ?? seedCalendarShellSession());
        return subscribeCalendarShellSession(() => {
            const next = peekCalendarShellSession();
            if (next) commit(next);
        });
    }, [commit]);

    const prevMonth = useCallback(() => {
        markRadarZoneSwitch('prev-month');
        const next = selectedDateAfterMonthShift(selectedDate, viewYear, viewMonth, -1);
        commit(
            patchCalendarShellSession({
                viewYear: next.year,
                viewMonth: next.month,
                selectedDate: next.selectedDate,
            }),
        );
    }, [commit, selectedDate, viewMonth, viewYear]);

    const nextMonth = useCallback(() => {
        markRadarZoneSwitch('next-month');
        const next = selectedDateAfterMonthShift(selectedDate, viewYear, viewMonth, 1);
        commit(
            patchCalendarShellSession({
                viewYear: next.year,
                viewMonth: next.month,
                selectedDate: next.selectedDate,
            }),
        );
    }, [commit, selectedDate, viewMonth, viewYear]);

    const goToToday = useCallback(() => {
        markRadarZoneSwitch('today');
        const now = new Date();
        commit(
            patchCalendarShellSession({
                viewYear: now.getFullYear(),
                viewMonth: now.getMonth(),
                selectedDate: todayYmd(),
            }),
        );
    }, [commit]);

    const handleDateClick = useCallback(
        (day: number) => {
            markRadarZoneSwitch('date-click');
            const m = String(viewMonth + 1).padStart(2, '0');
            const d = String(day).padStart(2, '0');
            commit(patchCalendarShellSession({ selectedDate: `${viewYear}-${m}-${d}` }));
        },
        [commit, viewMonth, viewYear],
    );

    const toggleFullMonth = useCallback(() => {
        markRadarZoneSwitch('fullmonth-toggle');
        commit(patchCalendarShellSession({ showFullMonth: !showFullMonth }));
    }, [commit, showFullMonth]);

    const focusDate = useCallback(
        (dateStr: string) => {
            markRadarZoneSwitch('focus-date');
            const parsed = viewFromCalendarYmd(dateStr);
            if (!parsed) return;
            commit(patchCalendarShellSession(parsed));
        },
        [commit],
    );

    return {
        viewYear,
        viewMonth,
        selectedDate,
        showFullMonth,
        prevMonth,
        nextMonth,
        goToToday,
        handleDateClick,
        toggleFullMonth,
        focusDate,
    };
}
