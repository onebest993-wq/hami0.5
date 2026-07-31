import type { ForumNotification } from '@/app/services/forum/forumTypes';
import { deriveNotificationCategory } from '@/app/infrastructure/notificationModel';
import { peekLocalNotifications } from '@/app/infrastructure/notificationPeekLite';
import { mapModelToForumNotification } from '@/app/services/notifications/forumNotificationMapper';
import { withForumAsyncTimeout } from '@/app/components/lawyer/CommunityScreen/forumAsync';

let warmedNotifications: ForumNotification[] | null = null;
let warmedUnread = 0;
let warmedUserId: string | null = null;
let warmPromise: Promise<{ notifications: ForumNotification[]; unreadCount: number }> | null = null;

function loadForumApiService() {
    return import('@/app/services/forumApiService');
}

export function peekForumNotificationsFromLocal(userId: string): ForumNotification[] {
    return peekLocalNotifications(userId)
        .filter((n) => deriveNotificationCategory(n) === 'forum')
        .map((n) => mapModelToForumNotification(n, userId))
        .filter((n): n is ForumNotification => n !== null)
        .slice(0, 25);
}

/** قراءة فورية من blob محلي — بدون انتظار API */
export function peekForumNotificationsCache(userId?: string | null): ForumNotification[] | null {
    if (userId && warmedUserId === userId && warmedNotifications) return warmedNotifications;
    if (!userId) return warmedNotifications;
    const local = peekForumNotificationsFromLocal(userId);
    return local.length > 0 ? local : warmedNotifications;
}

export function peekForumNotificationsUnreadCache(userId?: string | null): number | null {
    if (userId && warmedUserId === userId) return warmedUnread;
    if (!userId) return warmedUnread > 0 ? warmedUnread : null;
    const local = peekForumNotificationsFromLocal(userId);
    if (local.length === 0) return warmedUnread > 0 ? warmedUnread : null;
    return local.filter((n) => !n.read).length;
}

export function warmForumNotificationsCache(userId: string): void {
    if (!userId) return;
    if (warmPromise && warmedUserId === userId) return;

    const local = peekForumNotificationsFromLocal(userId);
    if (local.length > 0) {
        warmedNotifications = local;
        warmedUnread = local.filter((n) => !n.read).length;
        warmedUserId = userId;
    }

    warmedUserId = userId;
    warmPromise = loadForumApiService()
        .then(({ ForumApiService }) =>
            withForumAsyncTimeout(
                ForumApiService.listForumNotifications(userId).then(({ notifications, unreadCount }) => {
                    const slice = notifications.slice(0, 25);
                    warmedNotifications = slice;
                    warmedUnread = unreadCount;
                    return { notifications: slice, unreadCount };
                }),
                5_000,
                {
                    notifications: warmedNotifications ?? local,
                    unreadCount: warmedUnread || local.filter((n) => !n.read).length,
                },
            ),
        )
        .catch(() => ({
            notifications: warmedNotifications ?? local,
            unreadCount: warmedUnread || local.filter((n) => !n.read).length,
        }));
}

export async function readForumNotificationsCache(
    userId: string,
): Promise<{ notifications: ForumNotification[]; unreadCount: number }> {
    warmForumNotificationsCache(userId);
    if (warmPromise) {
        return warmPromise;
    }
    const local = peekForumNotificationsFromLocal(userId);
    return {
        notifications: local,
        unreadCount: local.filter((n) => !n.read).length,
    };
}

export function resetForumNotificationsCacheForTests(): void {
    warmedNotifications = null;
    warmedUnread = 0;
    warmedUserId = null;
    warmPromise = null;
}
