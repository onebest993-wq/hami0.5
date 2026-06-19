import { useCallback, useMemo, useState } from 'react';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { prefetchNotificationPanel } from '@/app/utils/lazyComponents';

export function useLawyerDashboardNotifications() {
    const notifications = useNotificationStore((s) => s.notifications);
    const notificationsUnreadCount = useNotificationStore((s) => s.unreadCount);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notificationPanelMounted, setNotificationPanelMounted] = useState(false);

    const openNotifications = useCallback(() => {
        prefetchNotificationPanel();
        setNotificationPanelMounted(true);
        setShowNotifications(true);
    }, []);

    const searchNotifications = useMemo(
        () =>
            notifications.map((n) => ({
                id: n.id,
                title: n.title,
                message: n.message,
                type: n.type,
            })),
        [notifications],
    );

    return {
        showNotifications,
        setShowNotifications,
        notificationPanelMounted,
        openNotifications,
        searchNotifications,
        notificationsUnreadCount,
    };
}
