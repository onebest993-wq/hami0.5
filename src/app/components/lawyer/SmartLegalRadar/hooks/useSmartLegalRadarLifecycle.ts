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

    useEffect(() => {
        prefetchRadarWidgets();
        return requestCalendarDossierSyncIdle();
    }, [userId]);

    useEffect(() => {
        markCalendarPerfPhase('first-paint');
        markCalendarPerfPhase('interactive');
        reportCalendarPerf({
            userId,
            eventCount,
            hadLocalCache: hadLocalCacheRef.current,
        });
    }, [userId, eventCount]);

    return { isShellReady: true, hadLocalCache: hadLocalCacheRef.current };
}
