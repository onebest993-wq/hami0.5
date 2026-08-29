import { useCallback, useEffect, useRef } from 'react';

import {
    loadGlobalSearchOverlayModule,
} from '@/app/runtime/globalSearchLoader';
import {
    hydrateGlobalSearchShellForInstantOpen,
    bindGlobalSearchBootHydrator,
} from '@/app/runtime/globalSearchBootHydrator';
import { warmGlobalSearchOnHover, warmGlobalSearchOnOpen } from '@/app/hooks/lawyerDashboard/globalSearchIntentWarm';

type UseGlobalSearchHostLifecycleParams = {
    userId: string | null;
    initialSessionOpen: boolean;
};

/**
 * مقطع الواجهة بعد dashboard-interactive (boot hydrator). extras/fuse عند اللمسة أو الفتح.
 * Host يُركَّب عند الفتح — ليس فور الهوية.
 */
export function useGlobalSearchHostLifecycle({
    initialSessionOpen,
}: UseGlobalSearchHostLifecycleParams): void {
    const restoredWarmRef = useRef(false);

    useEffect(() => {
        return bindGlobalSearchBootHydrator();
    }, []);

    useEffect(() => {
        if (!initialSessionOpen || restoredWarmRef.current) return;
        restoredWarmRef.current = true;
        warmGlobalSearchOnOpen();
        void hydrateGlobalSearchShellForInstantOpen(true).catch(() => undefined);
        void loadGlobalSearchOverlayModule().catch(() => undefined);
    }, [initialSessionOpen]);
}

/** لمسة أيقونة البحث: قرص + مقطع — بلا تركيب Host حتى الفتح */
export function primeGlobalSearchHostMount(): void {
    warmGlobalSearchOnHover();
    void hydrateGlobalSearchShellForInstantOpen(true).catch(() => undefined);
    void loadGlobalSearchOverlayModule().catch(() => undefined);
}

export function usePrimeGlobalSearchShellMount(): () => void {
    return useCallback(() => {
        primeGlobalSearchHostMount();
    }, []);
}
