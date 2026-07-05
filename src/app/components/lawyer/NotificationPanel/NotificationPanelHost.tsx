import React, { useLayoutEffect, useState } from 'react';
import type { NotificationPanelProps } from '@/app/components/lawyer/NotificationPanel/types';
import { NotificationPanelLoadingFallback } from '@/app/components/lawyer/LawyerDashboardParts/LazyFallback';
import {
    getCachedNotificationPanel,
    loadNotificationPanelModule,
} from '@/app/runtime/notificationPanelLoader';
import {
    NOTIFICATION_SHELL_HYDRATED_EVENT,
    hydrateNotificationShellForInstantOpen,
} from '@/app/runtime/notificationBootHydrator';

type NotificationPanelComponent = React.ComponentType<NotificationPanelProps>;

/** يحمّل لوحة الإشعارات مرة واحدة — يعرض shell فوري أثناء التحميل */
export function NotificationPanelHost(props: NotificationPanelProps): React.ReactElement | null {
    const { isOpen, onClose } = props;
    const [Component, setComponent] = useState<NotificationPanelComponent | null>(
        () => getCachedNotificationPanel(),
    );

    useLayoutEffect(() => {
        let cancelled = false;

        const adoptModule = () => {
            const cached = getCachedNotificationPanel();
            if (cached) {
                setComponent(() => cached);
                return;
            }
            void loadNotificationPanelModule().then((mod) => {
                if (!cancelled && mod?.NotificationPanel) {
                    setComponent(() => mod.NotificationPanel);
                }
            });
        };

        adoptModule();

        const onHydrated = () => adoptModule();
        window.addEventListener(NOTIFICATION_SHELL_HYDRATED_EVENT, onHydrated);

        return () => {
            cancelled = true;
            window.removeEventListener(NOTIFICATION_SHELL_HYDRATED_EVENT, onHydrated);
        };
    }, []);

    useLayoutEffect(() => {
        if (!isOpen) return;
        void hydrateNotificationShellForInstantOpen(true);
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    if (!Component) {
        return <NotificationPanelLoadingFallback onClose={onClose} />;
    }

    return <Component {...props} />;
}
