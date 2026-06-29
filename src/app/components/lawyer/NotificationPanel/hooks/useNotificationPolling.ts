import { useEffect } from 'react';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { TIMING } from '@/app/utils/constants';

function isDocumentVisible(): boolean {
    return typeof document === 'undefined' || document.visibilityState !== 'hidden';
}

/** جلب دوري للإشعارات أثناء فتح اللوحة — يتوقف عند إخفاء التبويب. */
export function useNotificationPolling(isOpen: boolean, userId: string) {
    const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);

    useEffect(() => {
        if (!isOpen || !userId) return;

        fetchNotifications(userId);

        let intervalId: ReturnType<typeof setInterval> | null = null;

        const startPolling = () => {
            if (intervalId != null) return;
            intervalId = setInterval(() => {
                fetchNotifications(userId);
            }, TIMING.NOTIFICATION_POLL);
        };

        const stopPolling = () => {
            if (intervalId != null) {
                clearInterval(intervalId);
                intervalId = null;
            }
        };

        if (isDocumentVisible()) startPolling();

        const onVisibilityChange = () => {
            if (isDocumentVisible()) {
                fetchNotifications(userId);
                startPolling();
            } else {
                stopPolling();
            }
        };

        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', onVisibilityChange);
        }

        return () => {
            stopPolling();
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', onVisibilityChange);
            }
        };
    }, [userId, isOpen, fetchNotifications]);
}
