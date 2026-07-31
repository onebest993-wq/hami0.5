import { useEffect, useRef } from 'react';
import {
    markCalendarPerfPhase,
    reportCalendarPerf,
} from '@/app/services/calendar/calendarPerfMetrics';
import { requestCalendarDossierSyncIdle } from '@/app/services/calendar/requestCalendarDossierSyncIdle';
import { prefetchRadarWidgets } from '@/app/runtime/radarWidgetLoader';
import { readLocalCalendarSnapshotSync } from '@/app/services/calendar/calendarLocalSnapshot';
import { getCachedCalendarEvents } from '@/app/services/calendar/calendarEventsCache';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/core';

export function useSmartLegalRadarLifecycle(
    userId: string,
    _syncing: boolean,
    eventCount: number,
) {
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
        prefetchRadarWidgets();
        return requestCalendarDossierSyncIdle();
    }, [userId]);

    useEffect(() => {
        reportedRef.current = false;
        const uid = resolveCalendarUserId(userId || null);
        const mem = getCachedCalendarEvents(uid);
        hadLocalCacheRef.current =
            (mem && mem.length > 0) || readLocalCalendarSnapshotSync(uid).length > 0;
    }, [userId]);

    useEffect(() => {
        if (reportedRef.current) return;
        reportedRef.current = true;
        markCalendarPerfPhase('first-paint');
        markCalendarPerfPhase('interactive');
        reportCalendarPerf({
            userId,
            eventCount,
            hadLocalCache: hadLocalCacheRef.current,
        });
    }, [userId, eventCount]);

    /* احتياطي — لا يبقى open→interactive معلّقاً إن تأخرت الجاهزية (C1/C9) */
    useEffect(() => {
        if (reportedRef.current) return;

        const markInteractiveFallback = () => {
            if (reportedRef.current) return;
            reportedRef.current = true;
            markCalendarPerfPhase('first-paint');
            markCalendarPerfPhase('interactive');
            reportCalendarPerf({
                userId,
                eventCount,
                hadLocalCache: hadLocalCacheRef.current,
            });
        };

        const fallback = window.setTimeout(markInteractiveFallback, 1_200);
        return () => window.clearTimeout(fallback);
    }, [eventCount, userId]);

    return { isShellReady: true, hadLocalCache: hadLocalCacheRef.current };
}
