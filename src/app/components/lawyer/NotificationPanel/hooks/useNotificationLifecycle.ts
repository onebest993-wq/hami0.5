import { useEffect, useRef } from 'react';
import {
    markNotificationPerfPhase,
} from '@/app/services/notifications/notificationPerfMetrics';

/** Perf marks only — interactive reporting lives in NotificationShell to avoid lazy-chunk cycles. */
export function useNotificationLifecycle(isOpen: boolean) {
    const reportedRef = useRef(false);

    useEffect(() => {
        if (!isOpen) {
            reportedRef.current = false;
            return;
        }
        markNotificationPerfPhase('first-paint');
    }, [isOpen]);
}
