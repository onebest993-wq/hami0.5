import { useEffect } from 'react';
import { HAMI_OS_NOTIFICATION_OPEN_PANEL_EVENT } from '@/app/services/notifications/notificationOsTapEvents';

/** نقر إشعار نظام التشغيل → فتح اللوحة دون إغلاقها إن كانت مفتوحة. */
export function useNotificationOsPanelOpen(ensureNotificationsOpen: () => void): void {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onOsOpenPanel = () => {
            ensureNotificationsOpen();
        };
        window.addEventListener(HAMI_OS_NOTIFICATION_OPEN_PANEL_EVENT, onOsOpenPanel);
        return () => {
            window.removeEventListener(HAMI_OS_NOTIFICATION_OPEN_PANEL_EVENT, onOsOpenPanel);
        };
    }, [ensureNotificationsOpen]);
}
