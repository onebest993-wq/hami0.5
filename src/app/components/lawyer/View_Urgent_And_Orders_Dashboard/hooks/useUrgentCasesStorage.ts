import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { HAMI_APP_STATE_EVENT, type HamiAppStateDetail } from '@/app/runtime/appStateEvents';
import { UrgentActionsDB } from '@/app/services/urgent-actions-db';
import { normalizeLoadedCases, serializeCasesForStorage } from '@/app/domain/urgent';
import {
    URGENT_MS_PER_DAY,
    hasUrgentGrievanceLogged,
    urgentDaysUntil,
    urgentGrievanceDeadline,
    type UrgentCase,
} from '../../Component_Urgent_Card';

function casesFromPeek(userId: string | null): UrgentCase[] {
    if (!userId) return [];
    const peek = UrgentActionsDB.peekState(userId);
    return peek ? normalizeLoadedCases(peek.cases) : [];
}

export function useUrgentCasesStorage(userId: string | null) {
    const [cases, setCases] = useState<UrgentCase[]>(() => casesFromPeek(userId));
    const [casesStorageReady, setCasesStorageReady] = useState(() =>
        Boolean(userId && UrgentActionsDB.peekState(userId)),
    );

    const hasHydratedCasesRef = useRef(Boolean(userId && UrgentActionsDB.peekState(userId)));
    const persistTimerRef = useRef<number | null>(null);
    const pendingCasesPersistRef = useRef(false);
    const casesRef = useRef(cases);
    casesRef.current = cases;

    const persistCases = useCallback(
        async (nextCases: UrgentCase[]) => {
            if (!userId) return;
            await UrgentActionsDB.saveState(userId, serializeCasesForStorage(nextCases));
        },
        [userId],
    );

    const flushPersistCases = useCallback(() => {
        if (!userId || !hasHydratedCasesRef.current || !casesStorageReady) return;
        void persistCases(casesRef.current);
    }, [userId, casesStorageReady, persistCases]);

    const persistSnapshot = useCallback(
        (nextCases: UrgentCase[]) => {
            if (!userId || !hasHydratedCasesRef.current || !casesStorageReady) {
                pendingCasesPersistRef.current = true;
                return;
            }
            pendingCasesPersistRef.current = false;
            if (persistTimerRef.current) {
                window.clearTimeout(persistTimerRef.current);
                persistTimerRef.current = null;
            }
            void persistCases(nextCases);
        },
        [userId, casesStorageReady, persistCases],
    );

    useLayoutEffect(() => {
        if (!userId) {
            hasHydratedCasesRef.current = false;
            setCases([]);
            setCasesStorageReady(false);
            return;
        }
        const peek = UrgentActionsDB.peekState(userId);
        if (!peek) {
            hasHydratedCasesRef.current = false;
            setCases([]);
            setCasesStorageReady(false);
            return;
        }
        setCases(normalizeLoadedCases(peek.cases));
        hasHydratedCasesRef.current = true;
        setCasesStorageReady(true);
    }, [userId]);

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;

        void (async () => {
            try {
                const state = await UrgentActionsDB.getState(userId);
                if (cancelled) return;
                const rawCases = Array.isArray(state?.cases) ? state!.cases : [];
                setCases(normalizeLoadedCases(rawCases));
                hasHydratedCasesRef.current = true;
                setCasesStorageReady(true);
            } catch {
                if (!cancelled) {
                    setCases([]);
                    hasHydratedCasesRef.current = true;
                    setCasesStorageReady(true);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [userId]);

    useEffect(() => {
        if (!casesStorageReady || !hasHydratedCasesRef.current || !userId) return;
        if (!pendingCasesPersistRef.current) return;
        if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
        persistTimerRef.current = window.setTimeout(() => {
            persistTimerRef.current = null;
            if (!pendingCasesPersistRef.current) return;
            pendingCasesPersistRef.current = false;
            void persistCases(casesRef.current);
        }, 500);
    }, [cases, userId, casesStorageReady, persistCases]);

    useEffect(() => {
        const flushNow = () => {
            if (!hasHydratedCasesRef.current || !casesStorageReady) return;
            if (persistTimerRef.current) {
                window.clearTimeout(persistTimerRef.current);
                persistTimerRef.current = null;
            }
            pendingCasesPersistRef.current = false;
            flushPersistCases();
        };
        const onPageHide = () => flushNow();
        const onVisibility = () => {
            if (document.visibilityState === 'hidden') flushNow();
        };
        const onNativeState = (event: Event) => {
            const detail = (event as CustomEvent<HamiAppStateDetail>).detail;
            if (detail && detail.isActive === false) flushNow();
        };
        window.addEventListener('pagehide', onPageHide);
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener(HAMI_APP_STATE_EVENT, onNativeState);
        return () => {
            window.removeEventListener('pagehide', onPageHide);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener(HAMI_APP_STATE_EVENT, onNativeState);
            if (persistTimerRef.current) {
                window.clearTimeout(persistTimerRef.current);
                persistTimerRef.current = null;
            }
            if (hasHydratedCasesRef.current) {
                flushPersistCases();
            }
        };
    }, [flushPersistCases, casesStorageReady]);

    useEffect(() => {
        if (!casesStorageReady) return;
        const runCleanup = () => {
            const snapshot = casesRef.current;
            const now = Date.now();
            const threshold = now - 30 * URGENT_MS_PER_DAY;
            let changed = false;

            const afterCleanup = snapshot.filter((c) => {
                if (!c.deleted) return true;
                if (!c.deletedAt) return true;
                const t = Date.parse(c.deletedAt);
                if (!Number.isFinite(t)) return true;
                const keep = t >= threshold;
                if (!keep) changed = true;
                return keep;
            });

            const afterExpiry = afterCleanup.map((c) => {
                if (c.deleted) return c;
                if (c.type !== 'state_order') return c;
                if (c.phase === 'completed' || c.status === 'completed') return c;
                if (c.legalState !== 'Awaiting_Grievance') return c;
                if (!c.notificationDate) return c;
                if (hasUrgentGrievanceLogged(c)) return c;
                const base = new Date(c.notificationDate);
                const daysLeft = urgentDaysUntil(urgentGrievanceDeadline(base));
                if (daysLeft >= 0) return c;
                changed = true;
                return {
                    ...c,
                    grievanceOutcome: 'expired' as const,
                    phase: 'completed' as const,
                    status: 'completed' as const,
                };
            });

            if (!changed) return;
            pendingCasesPersistRef.current = true;
            setCases(afterExpiry);
        };

        runCleanup();
        const intervalId = window.setInterval(runCleanup, 30_000);
        return () => window.clearInterval(intervalId);
    }, [casesStorageReady]);

    return {
        cases,
        setCases,
        casesStorageReady,
        pendingCasesPersistRef,
        persistSnapshot,
        flushPersistCases,
        msPerDay: URGENT_MS_PER_DAY,
    };
}
