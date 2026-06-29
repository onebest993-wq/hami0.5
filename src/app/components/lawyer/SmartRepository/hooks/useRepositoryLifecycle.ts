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
    const hadVaultCacheRef = useRef(Boolean(uid && peekVaultDocsWarmCache(uid)));

    /** الفلاتر والشريط يظهران فور mount — لا ننتظر vault */
    const isShellReady = true;

    const feedLoading =
        vaultLoading && vaultDocCount === 0 && notesCount === 0 && !hadVaultCacheRef.current;

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
