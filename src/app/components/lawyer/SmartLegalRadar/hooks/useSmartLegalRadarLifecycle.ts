import { useEffect, useRef } from 'react';
import {
    markCalendarPerfPhase,
    reportCalendarPerf,
} from '@/app/services/calendar/calendarPerfMetrics';
import { readLocalCalendarSnapshotSync } from '@/app/services/calendar/calendarLocalSnapshot';
import { getCachedCalendarEvents } from '@/app/services/calendar/calendarEventsCache';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/core';

export function useSmartLegalRadarLifecycle(
    userId: string,
    eventCount: number,
    screenActive = true,
): void {
    const hadLocalCacheRef = useRef(
        (() => {
            const uid = resolveCalendarUserId(userId || null);
            const mem = getCachedCalendarEvents(uid);
            if (mem && mem.length > 0) return true;
            return readLocalCalendarSnapshotSync(uid).length > 0;
        })(),
    );
    const reportedRef = useRef(false);

    useEffect(() => {
        reportedRef.current = false;
        const uid = resolveCalendarUserId(userId || null);
        const mem = getCachedCalendarEvents(uid);
        hadLocalCacheRef.current =
            (mem && mem.length > 0) || readLocalCalendarSnapshotSync(uid).length > 0;
    }, [userId]);

    useEffect(() => {
        if (!screenActive) {
            reportedRef.current = false;
            return;
        }
        if (reportedRef.current) return;
        reportedRef.current = true;
        markCalendarPerfPhase('first-paint');
        markCalendarPerfPhase('interactive');
        reportCalendarPerf({
            userId,
            eventCount,
            hadLocalCache: hadLocalCacheRef.current,
        });
    }, [screenActive, userId, eventCount]);
}
