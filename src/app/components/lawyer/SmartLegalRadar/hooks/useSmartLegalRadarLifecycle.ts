import { useEffect, useRef } from 'react';
import {
    markCalendarPerfPhase,
    reportCalendarPerf,
} from '@/app/services/calendar/calendarPerfMetrics';
import { requestCalendarDossierSyncIdle } from '@/app/services/calendar/requestCalendarDossierSyncIdle';
import { readLocalCalendarSnapshotSync } from '@/app/services/calendar/calendarLocalSnapshot';
import { getCachedCalendarEvents } from '@/app/services/calendar/calendarEventsCache';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';

export function useSmartLegalRadarLifecycle(
    userId: string,
    loading: boolean,
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
        return requestCalendarDossierSyncIdle();
    }, [userId]);

    const isShellReady = !loading || eventCount > 0 || hadLocalCacheRef.current;

    useEffect(() => {
        if (!isShellReady) return;
        markCalendarPerfPhase('first-paint');
        markCalendarPerfPhase('interactive');
        reportCalendarPerf({
            userId,
            eventCount,
            hadLocalCache: hadLocalCacheRef.current,
        });
    }, [isShellReady, userId, eventCount]);

    return { isShellReady, hadLocalCache: hadLocalCacheRef.current };
}
