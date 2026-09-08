import { useEffect, useRef } from 'react';
import { isGlobalSearchOverlayModuleResolved } from '@/app/runtime/globalSearchModuleState';
import {
    markGlobalSearchPerfPhase,
    reportGlobalSearchPerf,
} from '@/app/services/search/globalSearchPerfMetrics';
import { observeGlobalSearchOverlayInteractive } from '@/app/hooks/lawyerDashboard/observeGlobalSearchOverlayInteractive';

let sessionIdCounter = 0;

/**
 * علامات interactive من الـ eager shell — تجنّب دوران استيراد داخل lazy chunk.
 */
export function useGlobalSearchShellLifecycle(
    isOpen: boolean,
    userId: string,
    hasLocalCache: boolean,
) {
    const reportedRef = useRef(false);
    const stopObserveRef = useRef<(() => void) | null>(null);
    const fallbackTimerRef = useRef<number | null>(null);
    const sessionIdRef = useRef(0);
    const activeSessionIdRef = useRef(0);

    const cleanupActiveGuards = () => {
        if (stopObserveRef.current) {
            try {
                stopObserveRef.current();
            } catch {
                /* ignore */
            }
            stopObserveRef.current = null;
        }
        if (fallbackTimerRef.current !== null) {
            window.clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
        }
    };

    useEffect(() => {
        if (!isOpen) {
            reportedRef.current = false;
            activeSessionIdRef.current = 0;
            cleanupActiveGuards();
            return;
        }

        sessionIdCounter += 1;
        sessionIdRef.current = sessionIdCounter;
        const currentSessionId = sessionIdRef.current;
        activeSessionIdRef.current = currentSessionId;
        reportedRef.current = false;

        cleanupActiveGuards();
        markGlobalSearchPerfPhase('first-paint');

        const markInteractiveNow = () => {
            if (activeSessionIdRef.current !== currentSessionId) return;
            if (reportedRef.current) return;
            reportedRef.current = true;
            markGlobalSearchPerfPhase('interactive');
            reportGlobalSearchPerf({
                userId: userId || undefined,
                hadLocalCache: hasLocalCache,
                hadChunkCached: isGlobalSearchOverlayModuleResolved(),
            });
            cleanupActiveGuards();
        };

        /* بلا userId — interactive فوراً للقياس (لا نُسقِط العلامة) */
        if (!userId) {
            fallbackTimerRef.current = window.setTimeout(markInteractiveNow, 0);
            return cleanupActiveGuards;
        }

        stopObserveRef.current = observeGlobalSearchOverlayInteractive({
            isDone: () => reportedRef.current,
            onInteractive: markInteractiveNow,
        });

        fallbackTimerRef.current = window.setTimeout(markInteractiveNow, 1_200);

        return cleanupActiveGuards;
    }, [hasLocalCache, isOpen, userId]);
}
