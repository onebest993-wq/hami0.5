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

export type NotificationPanelHostProps = NotificationPanelProps & {
    /** يبقي اللوحة mounted بعد الإغلاق — فتح/إغلاق أسرع */
    keepAlive?: boolean;
};

/** يحمّل لوحة الإشعارات مرة واحدة — يعرض shell فوري أثناء التحميل */
export function NotificationPanelHost({
    keepAlive = false,
    isOpen,
    onClose,
    ...rest
}: NotificationPanelHostProps): React.ReactElement | null {
    const [Component, setComponent] = useState<NotificationPanelComponent | null>(
        () => getCachedNotificationPanel(),
    );
    const shouldMount = isOpen || keepAlive;

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
        if (!shouldMount) return;
        void hydrateNotificationShellForInstantOpen(true);
    }, [shouldMount]);

    if (!shouldMount) {
        return null;
    }

    if (!Component) {
        if (!isOpen) return null;
        return <NotificationPanelLoadingFallback embedded onClose={onClose} />;
    }

    return (
        <Component
            isOpen={isOpen}
            keepAlive={keepAlive}
            onClose={onClose}
            {...rest}
        />
    );
}
