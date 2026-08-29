import { useEffect, useLayoutEffect, useRef } from 'react';

import { onDashboardInteractive } from '@/app/bootstrap/bootMetrics';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import {
    loadNotificationBootHydrator,
    loadNotificationIntentWarm,
} from '@/app/hooks/lawyerDashboard/notifications/notificationDashboardLazyImports';
import { NOTIFICATION_PRIME_HOST_EVENT } from '@/app/runtime/notificationBootEvents';
import { shouldKeepNotificationHostWarm } from '@/app/services/notifications/notificationHostKeepAlive';

type UseNotificationHostLifecycleParams = {
    userId: string | null;
    initialSessionOpen: boolean;
    setNotificationHostMounted: (mounted: boolean) => void;
};

/** تركيب Host بعد interactive + تسخين عند استعادة الجلسة. */
export function useNotificationHostLifecycle({
    userId,
    initialSessionOpen,
    setNotificationHostMounted,
}: UseNotificationHostLifecycleParams): void {
    const restoredWarmRef = useRef(false);

    useEffect(() => {
        let unbind: (() => void) | undefined;
        void loadNotificationBootHydrator().then((m) => {
            unbind = m.bindNotificationBootHydrator();
        });
        return () => unbind?.();
    }, []);

    useLayoutEffect(() => {
        return onDashboardInteractive(() => {
            if (shouldKeepNotificationHostWarm()) {
                setNotificationHostMounted(true);
            }
            const uid = userId?.trim();
            if (uid) {
                void import('@/app/stores/notificationStore')
                    .then((m) => m.useNotificationStore.getState().hydrateFromLocalPeek(uid))
                    .catch(() => undefined);
                void import('@/app/services/notifications/HamiNotificationBridge').then((m) =>
                    m.initializeHamiNotificationBridge(uid),
                );
            }
            if (!isLitePerformanceActive()) {
                void loadNotificationIntentWarm()
                    .then((m) => m.warmNotificationsOnHover())
                    .catch(() => undefined);
            }
            void loadNotificationBootHydrator()
                .then((m) => m.hydrateNotificationShellForInstantOpen(true))
                .catch(() => undefined);
        });
    }, [setNotificationHostMounted, userId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onPrime = () => setNotificationHostMounted(true);
        window.addEventListener(NOTIFICATION_PRIME_HOST_EVENT, onPrime);
        return () => window.removeEventListener(NOTIFICATION_PRIME_HOST_EVENT, onPrime);
    }, [setNotificationHostMounted]);

    useEffect(() => {
        if (!initialSessionOpen || restoredWarmRef.current) return;
        restoredWarmRef.current = true;
        void loadNotificationIntentWarm()
            .then((m) => m.warmNotificationsOnOpen(userId))
            .catch(() => undefined);
        void loadNotificationBootHydrator()
            .then((m) => m.hydrateNotificationShellForInstantOpen(true))
            .catch(() => undefined);
    }, [initialSessionOpen, userId]);
}

export function primeNotificationHostMount(): void {
    void loadNotificationIntentWarm()
        .then((m) => m.warmNotificationsOnHover())
        .catch(() => undefined);
    void loadNotificationBootHydrator()
        .then((m) => m.hydrateNotificationShellForInstantOpen(true))
        .catch(() => undefined);
}
