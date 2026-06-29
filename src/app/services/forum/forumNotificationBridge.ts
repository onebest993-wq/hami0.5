import type { ForumNotification } from '@/app/services/lawyer-cloud';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { mapForumNotificationToModel } from '@/app/services/notifications/forumNotificationMapper';

export const FORUM_UNREAD_CHANGED_EVENT = 'hami:forum-unread-changed';

/** مزامنة إشعارات المنتدى → notificationStore (معرّف موحّد، بدون AuditLog). */
export function syncForumNotificationsToAppStore(userId: string, notifications: ForumNotification[]): number {
    if (typeof window === 'undefined' || !userId) return 0;

    const models = notifications
        .filter((n) => !n.userId || n.userId === userId)
        .map(mapForumNotificationToModel);

    if (models.length === 0) return 0;

    useNotificationStore.getState().upsertNotifications(models);
    return models.length;
}

export function emitForumUnreadCount(count: number, options?: { refresh?: boolean }): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent(FORUM_UNREAD_CHANGED_EVENT, { detail: { count, refresh: options?.refresh === true } }),
    );
}
