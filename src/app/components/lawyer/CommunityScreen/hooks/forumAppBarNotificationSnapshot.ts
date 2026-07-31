import type { ForumNotification } from '@/app/services/lawyer-cloud';
import {
    peekForumNotificationsCache,
    peekForumNotificationsFromLocal,
    peekForumNotificationsUnreadCache,
} from '@/app/services/forum/forumNotificationsWarmCache';

export function resolveInitialForumNotifications(userId: string | null | undefined): {
    notifications: ForumNotification[];
    unreadCount: number;
} {
    if (!userId) return { notifications: [], unreadCount: 0 };
    const cached = peekForumNotificationsCache(userId);
    if (cached && cached.length > 0) {
        return {
            notifications: cached,
            unreadCount: peekForumNotificationsUnreadCache(userId) ?? cached.filter((n) => !n.read).length,
        };
    }
    const local = peekForumNotificationsFromLocal(userId);
    return {
        notifications: local,
        unreadCount: local.filter((n) => !n.read).length,
    };
}

export function applyForumNotificationsSnapshot(
    slice: ForumNotification[],
    unread: number,
    seenNotifIdsRef: { current: Set<string> },
    lastUnreadRef: { current: number },
): void {
    lastUnreadRef.current = unread;
    for (const n of slice) seenNotifIdsRef.current.add(n.id);
}

export function sortForumNotificationsByDate(notifications: ForumNotification[]): ForumNotification[] {
    return [...notifications].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
