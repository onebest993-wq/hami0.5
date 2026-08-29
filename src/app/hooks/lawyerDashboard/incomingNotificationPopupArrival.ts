import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import { notificationChannelFromModel } from '@/app/services/notifications/notificationChannelFromModel';
import { playNotificationArrivalCue } from '@/app/services/notifications/notificationArrivalSound';

/** نغمة وصول داخل التطبيق فقط والواجهة ظاهرة — في الخلفية إشعار نظام دون Web Audio. */
export function announceIncomingNotificationArrival(newest: NotificationModel): void {
    const channel = notificationChannelFromModel(newest);
    const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    if (!hidden) {
        void playNotificationArrivalCue(channel).catch(() => undefined);
        return;
    }
    void import('@/app/services/notifications/HamiNotificationBridge')
        .then(({ showHamiNotification }) =>
            showHamiNotification(channel, {
                title: newest.title,
                body: newest.message,
                tag: `inbox-${newest.id}`,
                data: {
                    path: channel === 'community' ? 'community' : undefined,
                    type: newest.type,
                    notificationId: newest.id,
                    ...(newest.actionPayload ?? {}),
                },
            }),
        )
        .catch(() => undefined);
}
