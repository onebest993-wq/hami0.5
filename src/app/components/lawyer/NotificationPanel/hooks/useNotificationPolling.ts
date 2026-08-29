import { useEffect } from 'react';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { useVisibilityAwareInterval } from '@/app/hooks/useVisibilityAwareInterval';
import { TIMING } from '@/app/utils/constants';

/** جلب دوري للإشعارات أثناء فتح اللوحة — يتوقف عند إخفاء التبويب. */
export function useNotificationPolling(isOpen: boolean, userId: string) {
    const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
    const enabled = isOpen && Boolean(userId);

    useEffect(() => {
        if (!enabled) return;
        fetchNotifications(userId);
    }, [enabled, userId, fetchNotifications]);

    useVisibilityAwareInterval(
        () => {
            fetchNotifications(userId);
        },
        TIMING.NOTIFICATION_POLL,
        enabled,
    );
}
