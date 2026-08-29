import type { NotificationModel } from '@/app/infrastructure/notificationModel';

export const HAMI_INBOX_NOTIFICATION_ARRIVED = 'hami:inbox-notification-arrived';

export function emitInboxNotificationArrived(notification: NotificationModel): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent<NotificationModel>(HAMI_INBOX_NOTIFICATION_ARRIVED, { detail: notification }),
    );
}
