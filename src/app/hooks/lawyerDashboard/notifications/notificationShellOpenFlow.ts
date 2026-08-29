import type { MutableRefObject } from 'react';

import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import { persistNotificationsSessionOpen } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import { paintNotificationInstantChrome } from '@/app/runtime/notificationInstantPaint';
import {
    loadNotificationBootHydrator,
    loadNotificationIntentWarm,
    loadNotificationPerfMetrics,
} from '@/app/hooks/lawyerDashboard/notifications/notificationDashboardLazyImports';
import { isNotificationReopenSuppressed } from '@/app/services/notifications/notificationReopenGuard';
import { shouldKeepNotificationHostWarm } from '@/app/services/notifications/notificationHostKeepAlive';

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

type BeginNotificationShellOpenParams = CommitNotificationShellOpenParams & {
    openInFlightRef: MutableRefObject<boolean>;
};

function schedulePostOpenWork(
    showNotificationsRef: MutableRefObject<boolean>,
    userId: string | null,
): void {
    const run = () => {
        if (!showNotificationsRef.current) return;
        void loadNotificationIntentWarm()
            .then((m) => m.warmNotificationsOnOpen(userId))
            .catch(() => undefined);
        void loadNotificationBootHydrator()
            .then((m) => m.hydrateNotificationShellForInstantOpen(true))
            .catch(() => undefined)
            .then(() =>
                loadNotificationPerfMetrics().then((m) => m.markNotificationPerfPhase('chunk-ready')),
            );
    };
    queueMicrotask(run);
}

/**
 * فتح لحظي: طلاء DOM في نفس اللمسة، ثم React دون تجميد الشجرة
 * حتى لا تُرمى اللوحة دفعة فوق الجسر.
 */
export function commitNotificationShellOpen({
    userId,
    showNotificationsRef,
    setNotificationHostMounted,
    setShowNotifications,
}: CommitNotificationShellOpenParams): void {
    clearNotificationOpenPerfMarks();
    showNotificationsRef.current = true;

    dismissTransientOverlays('notifications');
    paintNotificationInstantChrome();

    const uid = userId?.trim();
    if (uid) {
        void import('@/app/stores/notificationStore')
            .then((m) => {
                m.useNotificationStore.getState().hydrateFromLocalPeek(uid);
            })
            .catch(() => undefined);
    }

    setNotificationHostMounted(true);
    setShowNotifications(true);
    queueMicrotask(() => persistNotificationsSessionOpen(true));
    schedulePostOpenWork(showNotificationsRef, userId);
}

/**
 * فتح من الجرس: ورقة أندرويد الأصلية إن فُعّلت، وإلا commit وبّي متزامن.
 */
export function beginNotificationShellOpen({
    openInFlightRef,
    ...commitParams
}: BeginNotificationShellOpenParams): void {
    if (isNotificationReopenSuppressed()) return;
    if (openInFlightRef.current) return;
    openInFlightRef.current = true;

    const commit = () => commitNotificationShellOpen(commitParams);

    if (import.meta.env.VITE_NATIVE_NOTIFICATION_SHEET === 'true') {
        void import('@/app/runtime/nativeNotificationSheetBridge')
            .then((m) => m.tryPresentNativeNotificationSheet(commitParams.userId))
            .then((presented) => {
                if (presented) {
                    if (!shouldKeepNotificationHostWarm()) {
                        commitParams.setNotificationHostMounted(false);
                    }
                    return;
                }
                commit();
            })
            .catch(() => {
                commit();
            })
            .finally(() => {
                openInFlightRef.current = false;
            });
        return;
    }

    try {
        commit();
    } finally {
        openInFlightRef.current = false;
    }
}
