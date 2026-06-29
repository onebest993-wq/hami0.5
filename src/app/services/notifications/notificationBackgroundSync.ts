import { useNotificationStore } from '@/app/stores/notificationStore';
import { ForumApiService } from '@/app/services/forumApiService';
import {
    emitForumUnreadCount,
    syncForumNotificationsToAppStore,
} from '@/app/services/forum/forumNotificationBridge';
import { purgeLegacyNotificationsIfNeeded } from '@/app/services/notifications/notificationLegacyMigration';
import { retryLegacyPrefixCleanupIfPartial } from '@/app/services/notifications/notificationForumKvMigration';
export type RefreshNotificationShellBadgeOptions = {
    /** جلب blob الإشعارات من KV — يُتخطّى عند فتح اللوحة (polling اللوحة يكفي). */
    includeStoreFetch?: boolean;
    /** مزامنة إشعارات المنتدى مع notificationStore. */
    includeForumSync?: boolean;
    /** تنظيف legacy audit_log من KV (مرة واحدة). */
    includeLegacyPurge?: boolean;
};

/** تحديث شارة الجرس: blob النظام + مزامنة المنتدى. */
export async function refreshNotificationShellBadge(
    userId: string,
    options?: RefreshNotificationShellBadgeOptions,
): Promise<void> {
    const includeStoreFetch = options?.includeStoreFetch !== false;
    const includeForumSync = options?.includeForumSync !== false;
    const includeLegacyPurge = options?.includeLegacyPurge !== false;

    if (includeLegacyPurge) {
        await purgeLegacyNotificationsIfNeeded(userId).catch(() => undefined);
        await retryLegacyPrefixCleanupIfPartial(userId).catch(() => undefined);
    }

    const tasks: Promise<unknown>[] = [];

    if (includeStoreFetch) {
        tasks.push(useNotificationStore.getState().fetchNotifications(userId));
    }
    if (includeForumSync) {
        tasks.push(
            ForumApiService.listForumNotifications(userId).then(({ notifications, unreadCount }) => {
                syncForumNotificationsToAppStore(userId, notifications);
                emitForumUnreadCount(unreadCount);
            }),
        );
    }

    if (tasks.length === 0) return;
    await Promise.allSettled(tasks);
}
