import { useCallback, useEffect, useRef, useState } from 'react';
import { UrgentActionsDB } from '@/app/services/urgent-actions-db';
import { normalizeLoadedCases, serializeCasesForStorage } from '@/app/domain/urgent';
import type { UrgentCase } from '../../Component_Urgent_Card';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const GRIEVANCE_DAYS = 3;

function startOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function useUrgentCasesStorage(userId: string | null) {
    const [cases, setCases] = useState<UrgentCase[]>([]);
    const [casesStorageReady, setCasesStorageReady] = useState(false);

    const hasHydratedCasesRef = useRef(false);
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

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        hasHydratedCasesRef.current = false;
        setCasesStorageReady(false);

        void (async () => {
            try {
                UrgentActionsDB.invalidateCache(userId);
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
        if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
        persistTimerRef.current = window.setTimeout(() => {
            persistTimerRef.current = null;
            void persistCases(cases);
        }, 500);
    }, [cases, userId, casesStorageReady, persistCases]);

    useEffect(() => {
        const onPageHide = () => {
            if (!hasHydratedCasesRef.current || !casesStorageReady) return;
            if (persistTimerRef.current) {
                window.clearTimeout(persistTimerRef.current);
                persistTimerRef.current = null;
            }
            flushPersistCases();
        };
        window.addEventListener('pagehide', onPageHide);
        return () => {
            window.removeEventListener('pagehide', onPageHide);
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
            const threshold = now - 30 * MS_PER_DAY;
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
                const hasGrievanceLogged =
                    c.grievanceOutcome === 'filed' ||
                    c.grievanceDecision === 'confirmed' ||
                    c.grievanceDecision === 'modified' ||
                    c.grievanceDecision === 'canceled';
                if (hasGrievanceLogged) return c;
                const base = new Date(c.notificationDate);
                const target = new Date(base.getTime() + GRIEVANCE_DAYS * MS_PER_DAY);
                const daysLeft = Math.ceil((startOfDay(target) - startOfDay(new Date())) / MS_PER_DAY);
                if (daysLeft >= 0) return c;
                if (c.grievanceOutcome === 'expired' && String((c as UrgentCase).phase) === 'completed') return c;
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
        flushPersistCases,
        msPerDay: MS_PER_DAY,
    };
}
