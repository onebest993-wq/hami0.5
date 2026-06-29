import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';

/** سقف موحّد لقائمة الإشعارات (محلي + KV blob). */
export const NOTIFICATION_LIST_CAP = 400;

export function capNotificationList(list: NotificationModel[]): NotificationModel[] {
    return list.length > NOTIFICATION_LIST_CAP ? list.slice(0, NOTIFICATION_LIST_CAP) : list;
}
