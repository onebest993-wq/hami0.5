import { useEffect, useRef } from 'react';
import {
    markRepositoryPerfPhase,
    reportRepositoryPerf,
} from '@/app/services/repository/repositoryPerfMetrics';
import { peekVaultDocsWarmCache } from '@/app/services/vault/vaultDocsWarmCache';

let sessionIdCounter = 0;

export function useRepositoryLifecycle(
    userId: string | undefined,
    vaultDocCount: number,
    notesCount: number,
    repositoryOpen = false,
) {
    const uid = userId?.trim() ?? '';
    const hadVaultCacheRef = useRef(peekVaultDocsWarmCache(uid) !== undefined);
    const reportedRef = useRef(false);
    const wasOpenRef = useRef(false);
    const sessionIdRef = useRef(0);
    const activeSessionIdRef = useRef(0);

    useEffect(() => {
        reportedRef.current = false;
        hadVaultCacheRef.current = peekVaultDocsWarmCache(uid) !== undefined;
    }, [uid]);

    useEffect(() => {
        if (repositoryOpen && !wasOpenRef.current) {
            reportedRef.current = false;
        }
        wasOpenRef.current = repositoryOpen;
    }, [repositoryOpen]);

    useEffect(() => {
        if (!repositoryOpen || reportedRef.current) return;

        sessionIdCounter += 1;
        const thisSessionId = sessionIdCounter;
        sessionIdRef.current = thisSessionId;
        activeSessionIdRef.current = thisSessionId;

        reportedRef.current = true;
        if (sessionIdRef.current !== activeSessionIdRef.current) return;
        markRepositoryPerfPhase('first-paint');
        markRepositoryPerfPhase('interactive');
        reportRepositoryPerf({
            userId,
            vaultDocCount,
            notesCount,
            hadVaultCache: hadVaultCacheRef.current,
        });
    }, [repositoryOpen, notesCount, userId, vaultDocCount]);

    /* احتياطي — لا يبقى open→interactive معلّقاً إن تأخر التبليغ (R1/R9) */
    useEffect(() => {
        if (!repositoryOpen || reportedRef.current) return;

        sessionIdCounter += 1;
        const fallbackSessionId = sessionIdCounter;
        sessionIdRef.current = fallbackSessionId;
        activeSessionIdRef.current = fallbackSessionId;

        const markInteractiveFallback = () => {
            if (sessionIdRef.current !== activeSessionIdRef.current) return;
            if (reportedRef.current) return;
            reportedRef.current = true;
            markRepositoryPerfPhase('first-paint');
            markRepositoryPerfPhase('interactive');
            reportRepositoryPerf({
                userId,
                vaultDocCount,
                notesCount,
                hadVaultCache: hadVaultCacheRef.current,
            });
        };

        const fallback = window.setTimeout(markInteractiveFallback, 1_200);
        return () => window.clearTimeout(fallback);
    }, [repositoryOpen, notesCount, uid, userId, vaultDocCount]);
}
