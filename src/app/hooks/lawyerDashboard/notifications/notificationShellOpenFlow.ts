import type { MutableRefObject } from 'react';

import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import { persistNotificationsSessionOpen } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import { paintNotificationInstantChrome } from '@/app/runtime/notificationInstantPaint';
import {
    loadNotificationBootHydrator,
    loadNotificationIntentWarm,
    loadNotificationPerfMetrics,
} from '@/app/hooks/lawyerDashboard/notifications/notificationDashboardLazyImports';
import { clearNotificationPerfMarks } from '@/app/services/notifications/notificationPerfMetrics';
import { isNotificationReopenSuppressed } from '@/app/services/notifications/notificationReopenGuard';
import { shouldKeepNotificationHostWarm } from '@/app/services/notifications/notificationHostKeepAlive';

let openFlowSessionIdCounter = 0;
let openFlowActiveSessionIdRef = 0;

export function clearNotificationOpenPerfMarks(): void {
    try {
        clearNotificationPerfMarks();
        if (typeof performance === 'undefined' || typeof performance.mark !== 'function') return;
        performance.mark('hami:notifications:open-request');
    } catch {
        /* ignore */
    }
}

type CommitNotificationShellOpenParams = {
    userId: string | null;
    showNotificationsRef: MutableRefObject<boolean>;
    setNotificationHostMounted: (mounted: boolean) => void;
    setShowNotifications: (open: boolean) => void;
};

type BeginNotificationShellOpenParams = CommitNotificationShellOpenParams & {
    openInFlightRef: MutableRefObject<boolean>;
};

function schedulePostOpenWork(
    flowId: number,
    showNotificationsRef: MutableRefObject<boolean>,
    userId: string | null,
): void {
    const run = () => {
        if (openFlowActiveSessionIdRef !== flowId) return;
        if (!showNotificationsRef.current) return;
        void loadNotificationIntentWarm()
            .then((m) => {
                if (openFlowActiveSessionIdRef !== flowId) return;
                if (!showNotificationsRef.current) return;
                return m.warmNotificationsOnOpen(userId);
            })
            .catch(() => undefined);
        void loadNotificationBootHydrator()
            .then((m) => {
                if (openFlowActiveSessionIdRef !== flowId) return;
                if (!showNotificationsRef.current) return;
                return m.hydrateNotificationShellForInstantOpen(true);
            })
            .catch(() => undefined)
            .then(() => {
                if (openFlowActiveSessionIdRef !== flowId) return;
                if (!showNotificationsRef.current) return;
                return loadNotificationPerfMetrics().then((m) =>
                    m.markNotificationPerfPhase('chunk-ready'),
                );
            });
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
    openFlowSessionIdCounter += 1;
    const flowId = openFlowSessionIdCounter;
    openFlowActiveSessionIdRef = flowId;

    clearNotificationOpenPerfMarks();
    showNotificationsRef.current = true;

    dismissTransientOverlays('notifications');
    paintNotificationInstantChrome();

    const uid = userId?.trim();
    if (uid) {
        void import('@/app/stores/notificationStore')
            .then((m) => {
                if (openFlowActiveSessionIdRef !== flowId) return;
                if (!showNotificationsRef.current) return;
                m.useNotificationStore.getState().hydrateFromLocalPeek(uid);
            })
            .catch(() => undefined);
    }

    setNotificationHostMounted(true);
    setShowNotifications(true);
    queueMicrotask(() => {
        if (openFlowActiveSessionIdRef !== flowId) return;
        if (!showNotificationsRef.current) return;
        persistNotificationsSessionOpen(true);
    });
    schedulePostOpenWork(flowId, showNotificationsRef, userId);
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

    openFlowSessionIdCounter += 1;
    const flowId = openFlowSessionIdCounter;
    openFlowActiveSessionIdRef = flowId;

    const commit = () => commitNotificationShellOpen(commitParams);

    if (import.meta.env.VITE_NATIVE_NOTIFICATION_SHEET === 'true') {
        void import('@/app/runtime/nativeNotificationSheetBridge')
            .then((m) => m.tryPresentNativeNotificationSheet(commitParams.userId))
            .then((presented) => {
                if (openFlowActiveSessionIdRef !== flowId) return;
                if (!commitParams.showNotificationsRef.current) return;
                if (presented) {
                    if (!shouldKeepNotificationHostWarm()) {
                        commitParams.setNotificationHostMounted(false);
                    }
                    return;
                }
                commit();
            })
            .catch(() => {
                if (openFlowActiveSessionIdRef !== flowId) return;
                if (!commitParams.showNotificationsRef.current) return;
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
