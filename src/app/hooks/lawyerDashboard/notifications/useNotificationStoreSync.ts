import { useEffect } from 'react';

import { onDashboardInteractive } from '@/app/bootstrap/bootMetrics';
import { loadNotificationStore } from '@/app/hooks/lawyerDashboard/notifications/notificationDashboardLazyImports';

export type SearchNotificationRow = {
    id: string;
    title: string;
    message: string;
    type: string;
};

type UseNotificationStoreSyncParams = {
    showNotifications: boolean;
    initialSessionOpen: boolean;
    setStoreUnreadCount: (count: number) => void;
    setSearchNotifications: (rows: SearchNotificationRow[]) => void;
};

/** ربط zustand بعد interactive أو عند فتح اللوحة — ليس على مسار أول paint. */
export function useNotificationStoreSync({
    showNotifications,
    initialSessionOpen,
    setStoreUnreadCount,
    setSearchNotifications,
}: UseNotificationStoreSyncParams): void {
    useEffect(() => {
        let cancelled = false;
        let unsub: (() => void) | undefined;
        let idleTimer: number | undefined;

        const bind = () => {
            void loadNotificationStore()
                .then(({ useNotificationStore }) => {
                    if (cancelled) return;
                    const sync = () => {
                        const s = useNotificationStore.getState();
                        setStoreUnreadCount(s.unreadCount);
                        setSearchNotifications(
                            s.notifications.map((n) => ({
                                id: n.id,
                                title: n.title,
                                message: n.message,
                                type: n.type,
                            })),
                        );
                    };
                    sync();
                    unsub = useNotificationStore.subscribe(sync);
                })
                .catch(() => undefined);
        };

        if (showNotifications || initialSessionOpen) {
            bind();
            return () => {
                cancelled = true;
                unsub?.();
            };
        }

        const offInteractive = onDashboardInteractive(() => {
            idleTimer = window.setTimeout(bind, 0);
        });

        return () => {
            cancelled = true;
            offInteractive();
            if (idleTimer != null) window.clearTimeout(idleTimer);
            unsub?.();
        };
    }, [showNotifications, initialSessionOpen]);
}
