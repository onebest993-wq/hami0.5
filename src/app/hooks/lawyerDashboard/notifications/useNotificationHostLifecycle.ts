import { useEffect, useLayoutEffect, useRef } from 'react';

import { onDashboardInteractive } from '@/app/bootstrap/bootMetrics';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { useNotificationStore } from '@/app/stores/notificationStore';
import {
    loadNotificationBootHydrator,
    loadNotificationIntentWarm,
} from '@/app/hooks/lawyerDashboard/notifications/notificationDashboardLazyImports';

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
            setNotificationHostMounted(true);
            const uid = userId?.trim();
            if (uid) {
                useNotificationStore.getState().hydrateFromLocalPeek(uid);
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
