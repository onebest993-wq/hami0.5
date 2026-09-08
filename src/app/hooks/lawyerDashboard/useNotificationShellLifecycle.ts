import { useEffect, useRef } from 'react';
import { isNotificationPanelModuleResolved } from '@/app/runtime/notificationPanelModuleState';
import {
    markNotificationPerfPhase,
    reportNotificationPerf,
} from '@/app/services/notifications/notificationPerfMetrics';
import { observeNotificationPanelInteractive } from '@/app/hooks/lawyerDashboard/observeNotificationPanelInteractive';

let notificationSessionIdCounter = 0;

/**
 * Interactive perf marks from the eager shell — avoids lazy-chunk import cycles
 * when the panel module is still resolving.
 */
export function useNotificationShellLifecycle(
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
        if (!userId) {
            cleanupActiveGuards();
            return;
        }

        notificationSessionIdCounter += 1;
        const currentSessionId = notificationSessionIdCounter;
        sessionIdRef.current = currentSessionId;
        activeSessionIdRef.current = currentSessionId;
        reportedRef.current = false;

        cleanupActiveGuards();
        markNotificationPerfPhase('first-paint');

        const markInteractiveNow = () => {
            if (activeSessionIdRef.current !== currentSessionId) return;
            if (reportedRef.current) return;
            reportedRef.current = true;
            markNotificationPerfPhase('interactive');
            reportNotificationPerf({
                userId,
                hadLocalCache: hasLocalCache,
                hadChunkCached: isNotificationPanelModuleResolved(),
            });
            cleanupActiveGuards();
        };

        stopObserveRef.current = observeNotificationPanelInteractive({
            isDone: () => reportedRef.current,
            onInteractive: markInteractiveNow,
        });

        /* احتياط: إن تأخر DOM observer لا نترك marks ناقصة بعد الفتح */
        fallbackTimerRef.current = window.setTimeout(markInteractiveNow, 1_200);

        return () => {
            activeSessionIdRef.current = 0;
            reportedRef.current = false;
            cleanupActiveGuards();
        };
    }, [hasLocalCache, isOpen, userId]);
}
