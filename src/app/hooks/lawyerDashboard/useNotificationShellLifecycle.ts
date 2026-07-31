import { useEffect, useRef } from 'react';
import { isNotificationPanelModuleResolved } from '@/app/runtime/notificationPanelModuleState';
import {
    markNotificationPerfPhase,
    reportNotificationPerf,
} from '@/app/services/notifications/notificationPerfMetrics';
import { observeNotificationPanelInteractive } from '@/app/hooks/lawyerDashboard/observeNotificationPanelInteractive';

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

    useEffect(() => {
        if (!isOpen) {
            reportedRef.current = false;
            return;
        }
        if (!userId) return;

        markNotificationPerfPhase('first-paint');

        const markInteractiveNow = () => {
            if (reportedRef.current) return;
            reportedRef.current = true;
            markNotificationPerfPhase('interactive');
            reportNotificationPerf({
                userId,
                hadLocalCache: hasLocalCache,
                hadChunkCached: isNotificationPanelModuleResolved(),
            });
        };

        const stopObserve = observeNotificationPanelInteractive({
            isDone: () => reportedRef.current,
            onInteractive: markInteractiveNow,
        });

        /* احتياط: إن تأخر DOM observer لا نترك marks ناقصة بعد الفتح */
        const fallback = window.setTimeout(markInteractiveNow, 1_200);

        return () => {
            stopObserve();
            window.clearTimeout(fallback);
        };
    }, [hasLocalCache, isOpen, userId]);
}
