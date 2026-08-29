import { useEffect, useRef } from 'react';
import {
    markRepositoryPerfPhase,
    reportRepositoryPerf,
} from '@/app/services/repository/repositoryPerfMetrics';
import { peekVaultDocsWarmCache } from '@/app/services/vault/vaultDocsWarmCache';

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
        reportedRef.current = true;
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

        const markInteractiveFallback = () => {
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
