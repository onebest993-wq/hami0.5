import { useEffect, useRef } from 'react';
import {
    markCalendarPerfPhase,
    reportCalendarPerf,
} from '@/app/services/calendar/calendarPerfMetrics';
import { peekLocalCalendarSnapshotSync } from '@/app/services/calendar/calendarLocalSnapshot';
import { getCachedCalendarEvents } from '@/app/services/calendar/calendarEventsCache';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/core';
import { tearDownCalendarFloatingState } from '@/app/components/lawyer/SmartLegalRadar/tearDownCalendarFloatingState';

let radarLifecycleSessionCounter = 0;
let lastActiveRadarLifecycleId = 0;

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
            return peekLocalCalendarSnapshotSync(uid).length > 0;
        })(),
    );
    const reportedRef = useRef(false);
    const sessionIdRef = useRef(0);
    const activeSessionIdRef = useRef(0);

    useEffect(() => {
        reportedRef.current = false;
        const uid = resolveCalendarUserId(userId || null);
        const mem = getCachedCalendarEvents(uid);
        hadLocalCacheRef.current =
            (mem && mem.length > 0) || peekLocalCalendarSnapshotSync(uid).length > 0;
    }, [userId]);

    useEffect(() => {
        if (!screenActive) {
            reportedRef.current = false;
            return;
        }
        if (reportedRef.current) return;

        radarLifecycleSessionCounter += 1;
        sessionIdRef.current = radarLifecycleSessionCounter;
        const thisSessionId = sessionIdRef.current;
        activeSessionIdRef.current = thisSessionId;
        lastActiveRadarLifecycleId = thisSessionId;

        const uid = resolveCalendarUserId(userId || null);
        const cached = getCachedCalendarEvents(uid);
        if (cached && cached.length > 0) {
            if (activeSessionIdRef.current !== thisSessionId) return;
            hadLocalCacheRef.current = true;
        }
        let cancelled = false;
        if (!(cached && cached.length > 0)) {
            void Promise.resolve()
                .then(() => {
                    if (cancelled) return;
                    if (activeSessionIdRef.current !== thisSessionId) return;
                    const snap = peekLocalCalendarSnapshotSync(uid);
                    if (activeSessionIdRef.current !== thisSessionId) return;
                    hadLocalCacheRef.current = snap.length > 0;
                })
                .catch(() => {
                    if (cancelled) return;
                    if (activeSessionIdRef.current !== thisSessionId) return;
                    return undefined;
                });
        }

        reportedRef.current = true;
        if (activeSessionIdRef.current !== thisSessionId) {
            return () => {
                cancelled = true;
                if (activeSessionIdRef.current === thisSessionId) {
                    activeSessionIdRef.current = 0;
                    tearDownCalendarFloatingState(thisSessionId);
                }
            };
        }
        if (sessionIdRef.current !== activeSessionIdRef.current) {
            return () => {
                cancelled = true;
                if (activeSessionIdRef.current === thisSessionId) {
                    activeSessionIdRef.current = 0;
                    tearDownCalendarFloatingState(thisSessionId);
                }
            };
        }
        markCalendarPerfPhase('first-paint');
        markCalendarPerfPhase('interactive');
        reportCalendarPerf({
            userId,
            eventCount,
            hadLocalCache: hadLocalCacheRef.current,
        });
        return () => {
            cancelled = true;
            if (activeSessionIdRef.current === thisSessionId) {
                activeSessionIdRef.current = 0;
                tearDownCalendarFloatingState(thisSessionId);
            }
        };
    }, [screenActive, userId, eventCount]);
}
