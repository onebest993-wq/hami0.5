import { useEffect, useRef } from 'react';
import { isGlobalSearchOverlayModuleResolved } from '@/app/runtime/globalSearchModuleState';
import {
    markGlobalSearchPerfPhase,
    reportGlobalSearchPerf,
} from '@/app/services/search/globalSearchPerfMetrics';
import { observeGlobalSearchOverlayInteractive } from '@/app/hooks/lawyerDashboard/observeGlobalSearchOverlayInteractive';

/**
 * علامات interactive من الـ eager shell — تجنّب دوران استيراد داخل lazy chunk.
 */
export function useGlobalSearchShellLifecycle(
    isOpen: boolean,
    userId: string,
    hasLocalCache: boolean,
) {
    const reportedRef = useRef(false);

    useEffect(() => {
        if (!isOpen) {
            reportedRef.current = false;
            return;
        }

        markGlobalSearchPerfPhase('first-paint');

        const markInteractiveNow = () => {
            if (reportedRef.current) return;
            reportedRef.current = true;
            markGlobalSearchPerfPhase('interactive');
            reportGlobalSearchPerf({
                userId: userId || undefined,
                hadLocalCache: hasLocalCache,
                hadChunkCached: isGlobalSearchOverlayModuleResolved(),
            });
        };

        /* بلا userId — interactive فوراً للقياس (لا نُسقِط العلامة) */
        if (!userId) {
            const fallbackNoUser = window.setTimeout(markInteractiveNow, 0);
            return () => window.clearTimeout(fallbackNoUser);
        }

        const stopObserve = observeGlobalSearchOverlayInteractive({
            isDone: () => reportedRef.current,
            onInteractive: markInteractiveNow,
        });

        const fallback = window.setTimeout(markInteractiveNow, 1_200);

        return () => {
            stopObserve();
            window.clearTimeout(fallback);
        };
    }, [hasLocalCache, isOpen, userId]);
}
