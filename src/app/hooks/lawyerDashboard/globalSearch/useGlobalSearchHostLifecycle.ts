import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { onDashboardInteractive } from '@/app/bootstrap/bootMetrics';
import {
    isGlobalSearchOverlayModuleResolved,
    loadGlobalSearchOverlayModule,
    prefetchGlobalSearchOverlayChunk,
} from '@/app/runtime/globalSearchLoader';
import {
    GLOBAL_SEARCH_SHELL_HYDRATED_EVENT,
    hydrateGlobalSearchShellForInstantOpen,
    bindGlobalSearchBootHydrator,
} from '@/app/runtime/globalSearchBootHydrator';
import { warmGlobalSearchOnHover, warmGlobalSearchOnOpen } from '@/app/hooks/lawyerDashboard/globalSearchIntentWarm';

type UseGlobalSearchHostLifecycleParams = {
    userId: string | null;
    initialSessionOpen: boolean;
    setSearchHostMounted: (mounted: boolean) => void;
};

/**
 * ركّب Host مخفياً فور وجود هوية — قبل أول لمسة بحث (نفس معيار الإعدادات).
 * lite: prefetch فوري + تركيب Host مؤجّل idle (بلا تسخين فهرس ثقيل فوري).
 */
export function useGlobalSearchHostLifecycle({
    userId,
    initialSessionOpen,
    setSearchHostMounted,
}: UseGlobalSearchHostLifecycleParams): void {
    const restoredWarmRef = useRef(false);

    useLayoutEffect(() => {
        if (!isRealSignedIn(userId)) return undefined;
        prefetchGlobalSearchOverlayChunk();
        if (isLitePerformanceActive()) {
            const armLite = () => {
                setSearchHostMounted(true);
                void loadGlobalSearchOverlayModule().catch(() => undefined);
            };
            const ric = window.requestIdleCallback?.(armLite, { timeout: 2_500 });
            const fallback = ric == null ? window.setTimeout(armLite, 1_200) : undefined;
            return () => {
                if (ric != null && typeof window.cancelIdleCallback === 'function') {
                    window.cancelIdleCallback(ric);
                }
                if (fallback != null) window.clearTimeout(fallback);
            };
        }
        setSearchHostMounted(true);
        warmGlobalSearchOnHover();
        void loadGlobalSearchOverlayModule().catch(() => undefined);
        void hydrateGlobalSearchShellForInstantOpen(true).catch(() => undefined);
        return undefined;
    }, [userId, setSearchHostMounted]);

    useLayoutEffect(() => {
        prefetchGlobalSearchOverlayChunk();
        if (isLitePerformanceActive()) return undefined;
        return onDashboardInteractive(() => {
            warmGlobalSearchOnHover();
            void hydrateGlobalSearchShellForInstantOpen(true)
                .then((ok) => {
                    if (ok && isRealSignedIn(userId)) {
                        setSearchHostMounted(true);
                    }
                })
                .catch(() => undefined);
        });
    }, [userId, setSearchHostMounted]);

    useEffect(() => {
        return bindGlobalSearchBootHydrator();
    }, []);

    useEffect(() => {
        if (!isRealSignedIn(userId) || isLitePerformanceActive()) return undefined;
        const armHost = () => {
            if (isGlobalSearchOverlayModuleResolved()) {
                setSearchHostMounted(true);
            }
        };
        armHost();
        window.addEventListener(GLOBAL_SEARCH_SHELL_HYDRATED_EVENT, armHost);
        return () => window.removeEventListener(GLOBAL_SEARCH_SHELL_HYDRATED_EVENT, armHost);
    }, [userId, setSearchHostMounted]);

    useEffect(() => {
        if (!initialSessionOpen || restoredWarmRef.current) return;
        restoredWarmRef.current = true;
        warmGlobalSearchOnOpen();
        void hydrateGlobalSearchShellForInstantOpen(true).catch(() => undefined);
        void loadGlobalSearchOverlayModule().catch(() => undefined);
    }, [initialSessionOpen]);
}

export function primeGlobalSearchHostMount(setSearchHostMounted: (mounted: boolean) => void): void {
    setSearchHostMounted(true);
    warmGlobalSearchOnHover();
    void hydrateGlobalSearchShellForInstantOpen(true).catch(() => undefined);
    void loadGlobalSearchOverlayModule().catch(() => undefined);
}

export function usePrimeGlobalSearchShellMount(
    setSearchHostMounted: (mounted: boolean) => void,
): () => void {
    return useCallback(() => {
        primeGlobalSearchHostMount(setSearchHostMounted);
    }, [setSearchHostMounted]);
}
