import {
    deriveNotificationCategory,
    type NotificationModel,
} from '@/app/infrastructure/NotificationRepository';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { emitForumUnreadCount } from '@/app/services/forum/forumNotificationEvents';
import {
    countForumUnread,
    persistForumMarkAllRead,
    persistForumNotificationRead,
} from '@/app/services/notifications/forumNotificationRead';

export function isForumShellNotification(n: Pick<NotificationModel, 'type' | 'category'>): boolean {
    return deriveNotificationCategory(n as NotificationModel) === 'forum';
}

/** المنتدى → لوحة الجرس: تحديث isRead في blob عند mark_read من المنتدى. */
export async function syncForumReadToShell(userId: string, notificationId: string): Promise<void> {
    const store = useNotificationStore.getState();
    const existing = store.notifications.find((n) => n.id === notificationId);
    if (!existing || existing.isRead) return;
    await store.markAsRead(userId, notificationId, { skipForumPersist: true });
}

/** المنتدى → لوحة الجرس: mark all forum items in shell. */
export async function syncForumMarkAllReadToShell(userId: string): Promise<void> {
    await useNotificationStore.getState().markForumNotificationsRead(userId, { skipForumPersist: true });
}

/** لوحة الجرس → المنتدى: persist فقط (بدون loop). */
export async function syncShellReadToForum(userId: string, notificationId: string): Promise<void> {
    await persistForumNotificationRead(userId, notificationId);
    const unread = await countForumUnread(userId);
    emitForumUnreadCount(unread);
}

export async function syncShellMarkAllReadToForum(userId: string): Promise<void> {
    await persistForumMarkAllRead(userId);
    emitForumUnreadCount(0);
}
