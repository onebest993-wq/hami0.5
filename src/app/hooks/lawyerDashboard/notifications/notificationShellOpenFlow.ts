import { flushSync } from 'react-dom';
import type { MutableRefObject } from 'react';

import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import { persistNotificationsSessionOpen } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import { revealNotificationWarmPanel } from '@/app/runtime/notificationInstantPaint';
import { useNotificationStore } from '@/app/stores/notificationStore';
import {
    loadNotificationBootHydrator,
    loadNotificationIntentWarm,
    loadNotificationPerfMetrics,
} from '@/app/hooks/lawyerDashboard/notifications/notificationDashboardLazyImports';

export function clearNotificationOpenPerfMarks(): void {
    try {
        if (typeof performance === 'undefined') return;
        for (const phase of ['open-request', 'chunk-ready', 'first-paint', 'interactive'] as const) {
            performance.clearMarks(`hami:notifications:${phase}`);
        }
        performance.mark('hami:notifications:open-request');
    } catch {
        /* ignore */
    }
}

export type CommitNotificationShellOpenParams = {
    userId: string | null;
    showNotificationsRef: MutableRefObject<boolean>;
    setNotificationHostMounted: (mounted: boolean) => void;
    setShowNotifications: (open: boolean) => void;
};

/** فتح اللوحة: reveal فوري ثم commit متزامن/RAF + hydrate + perf. */
export function commitNotificationShellOpen({
    userId,
    showNotificationsRef,
    setNotificationHostMounted,
    setShowNotifications,
}: CommitNotificationShellOpenParams): void {
    clearNotificationOpenPerfMarks();
    showNotificationsRef.current = true;

    const uid = userId?.trim();

    void loadNotificationIntentWarm()
        .then((m) => m.warmNotificationsOnOpen(userId))
        .catch(() => undefined);

    revealNotificationWarmPanel();

    flushSync(() => {
        setNotificationHostMounted(true);
        setShowNotifications(true);
    });

    persistNotificationsSessionOpen(true);
    queueMicrotask(() => {
        if (uid) {
            useNotificationStore.getState().hydrateFromLocalPeek(uid);
        }
        dismissTransientOverlays('notifications');
    });

    void loadNotificationBootHydrator()
        .then((m) => m.hydrateNotificationShellForInstantOpen(true))
        .catch(() => undefined)
        .then(() =>
            loadNotificationPerfMetrics().then((m) => m.markNotificationPerfPhase('chunk-ready')),
        );
}
