import { useCallback, useMemo } from 'react';
import {
    NOTIFICATION_INBOX_CHANNEL_KEYS,
    NOTIFICATION_INBOX_CHANNEL_LABELS,
} from '@/app/services/settings/notificationSettings';
import {
    previewNotificationArrivalCue,
} from '@/app/services/notifications/notificationArrivalSound';
import {
    requestHamiNotificationPermission,
    previewHamiOsNotification,
} from '@/app/services/notifications/HamiNotificationBridge';
import { useNotificationDndControls } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationDndControls';

export function useNotificationAlertControls() {
    const dnd = useNotificationDndControls();

    const channelRows = useMemo(
        () =>
            NOTIFICATION_INBOX_CHANNEL_KEYS.map((channel) => ({
                channel,
                label: NOTIFICATION_INBOX_CHANNEL_LABELS[channel],
                prefs: dnd.notifications.channels[channel],
            })),
        [dnd.notifications.channels],
    );

    const requestOsPermission = useCallback(() => {
        void (async () => {
            await previewNotificationArrivalCue();
            const perm = await requestHamiNotificationPermission({
                fromUserGesture: true,
            });
            if (perm === 'granted') {
                await previewHamiOsNotification();
            }
        })();
    }, []);

    return {
        ...dnd,
        channelRows,
        requestOsPermission,
        previewArrivalCue: previewNotificationArrivalCue,
    };
}
