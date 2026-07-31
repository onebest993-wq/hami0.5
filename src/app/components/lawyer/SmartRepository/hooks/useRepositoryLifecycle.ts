import { useEffect, useRef } from 'react';
import {
    markRepositoryPerfPhase,
    reportRepositoryPerf,
} from '@/app/services/repository/repositoryPerfMetrics';
import { peekVaultDocsWarmCache } from '@/app/services/vault/vaultDocsWarmCache';

export function useRepositoryLifecycle(
    userId: string | undefined,
    vaultLoading: boolean,
    vaultDocCount: number,
    notesCount: number,
    _notesBootSettled?: boolean,
) {
    const uid = userId?.trim() ?? '';
    const hadVaultCacheRef = useRef(peekVaultDocsWarmCache(uid) !== undefined);
    const reportedRef = useRef(false);

    /** الفلاتر والقائمة تظهر فوراً — بيانات vault تُدمَج عند وصولها دون حجب كامل */
    const isShellReady = true;
    const feedLoading = false;

    useEffect(() => {
        reportedRef.current = false;
        hadVaultCacheRef.current = peekVaultDocsWarmCache(uid) !== undefined;
    }, [uid]);

    useEffect(() => {
        if (!isShellReady || reportedRef.current) return;
        reportedRef.current = true;
        markRepositoryPerfPhase('first-paint');
        markRepositoryPerfPhase('interactive');
        reportRepositoryPerf({
            userId,
            vaultDocCount,
            notesCount,
            hadVaultCache: hadVaultCacheRef.current,
        });
    }, [isShellReady, notesCount, userId, vaultDocCount]);

    /* احتياطي — لا يبقى open→interactive معلّقاً إن تأخرت الجاهزية (R1/R9) */
    useEffect(() => {
        if (reportedRef.current) return;

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
    }, [notesCount, uid, userId, vaultDocCount]);

    return { isShellReady, feedLoading, hadVaultCache: hadVaultCacheRef.current };
}
