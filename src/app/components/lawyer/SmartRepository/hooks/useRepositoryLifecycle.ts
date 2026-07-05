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
) {
    const uid = userId?.trim() ?? '';
    const hadVaultCacheRef = useRef(peekVaultDocsWarmCache(uid) !== undefined);

    /** الفلاتر والقائمة تظهر فوراً — بيانات vault تُدمَج عند وصولها دون حجب كامل */
    const isShellReady = true;
    const feedLoading = false;

    useEffect(() => {
        if (!isShellReady) return;
        markRepositoryPerfPhase('first-paint');
        markRepositoryPerfPhase('interactive');
        reportRepositoryPerf({
            userId,
            vaultDocCount,
            notesCount,
            hadVaultCache: hadVaultCacheRef.current,
        });
    }, [isShellReady, notesCount, userId, vaultDocCount]);

    return { isShellReady, feedLoading, hadVaultCache: hadVaultCacheRef.current };
}
