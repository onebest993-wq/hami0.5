import type { ForumNotification } from '@/app/services/forum/forumTypes';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { mapForumNotificationToModel } from '@/app/services/notifications/forumNotificationMapper';

/** إعادة تصدير أحداث الشارة — المصدر الذري: forumNotificationEvents (لا تُسحَب مع LawyerDashboard). */
export {
    FORUM_UNREAD_CHANGED_EVENT,
    emitForumUnreadCount,
} from '@/app/services/forum/forumNotificationEvents';

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
