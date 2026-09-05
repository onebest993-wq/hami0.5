import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { getForumSessionUserId, hasForumRemoteSession } from '@/app/services/forum/forumApi/forumApiClientCore';
import type { ForumNotification } from '@/app/services/cloud/lawyerCommunityTypes';
import {
    deriveNotificationCategory,
    peekLocalNotifications,
} from '@/app/infrastructure/NotificationRepository';
import { mapModelToForumNotification } from '@/app/services/notifications/forumNotificationMapper';
import {
    countForumUnread,
    persistForumMarkAllRead,
    persistForumNotificationDismiss,
    persistForumNotificationRead,
} from '@/app/services/notifications/forumNotificationRead';
import { NotificationDB } from '@/app/services/notifications/notificationForumStorage';
import { emitForumUnreadCount } from '@/app/services/forum/forumNotificationEvents';
import { syncForumNotificationsToAppStore } from '@/app/services/forum/forumNotificationBridge';

function mergeForumNotificationsById(...lists: ForumNotification[][]): ForumNotification[] {
    const byId = new Map<string, ForumNotification>();
    for (const list of lists) {
        for (const item of list) {
            if (!item?.id) continue;
            byId.set(item.id, item);
        }
    }
    return [...byId.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function listForumNotifications(requesterId?: string | null): Promise<{
    notifications: ForumNotification[];
    unreadCount: number;
}> {
    const userId = await getForumSessionUserId(requesterId);
    if (!userId) return { notifications: [], unreadCount: 0 };

    const [blobLocal] = await Promise.all([NotificationDB.getNotifications(userId)]);
    const repoLocal = peekLocalNotifications(userId)
        .filter((n) => deriveNotificationCategory(n) === 'forum')
        .map((n) => mapModelToForumNotification(n, userId))
        .filter((n): n is ForumNotification => n !== null);
    const local = mergeForumNotificationsById(blobLocal, repoLocal);

    if (!(await hasForumRemoteSession())) {
        return {
            notifications: local,
            unreadCount: local.filter((n) => !n.read).length,
        };
    }

    try {
        const res = await SecureAPIClient.fetchSecure<{
            ok: boolean;
            notifications: ForumNotification[];
            unreadCount: number;
        }>('/api/forum/notifications', { method: 'GET' });
        const notifications = Array.isArray(res.notifications) ? res.notifications : local;
        const unreadCount =
            typeof res.unreadCount === 'number'
                ? res.unreadCount
                : notifications.filter((n) => !n.read).length;

        if (typeof window !== 'undefined') {
            syncForumNotificationsToAppStore(userId, notifications);
            emitForumUnreadCount(unreadCount);
        }

        return { notifications, unreadCount };
    } catch {
        const unreadCount = local.filter((n) => !n.read).length;
        if (typeof window !== 'undefined') {
            emitForumUnreadCount(unreadCount);
        }
        return {
            notifications: local,
            unreadCount,
        };
    }
}

export async function markForumNotificationRead(
    notificationId: string,
    requesterId?: string | null,
): Promise<void> {
    const userId = await getForumSessionUserId(requesterId);
    if (!userId) return;

    await persistForumNotificationRead(userId, notificationId);

    if (typeof window !== 'undefined') {
        const { syncForumReadToShell } = await import('@/app/services/notifications/notificationReadSync');
        await syncForumReadToShell(userId, notificationId);
        const remaining = await countForumUnread(userId);
        emitForumUnreadCount(remaining);
    }
}

export async function markAllForumNotificationsRead(requesterId?: string | null): Promise<void> {
    const userId = await getForumSessionUserId(requesterId);
    if (!userId) return;

    await persistForumMarkAllRead(userId);

    if (typeof window !== 'undefined') {
        const { syncForumMarkAllReadToShell } = await import(
            '@/app/services/notifications/notificationReadSync'
        );
        await syncForumMarkAllReadToShell(userId);
        emitForumUnreadCount(0);
    }
}

export async function dismissForumNotification(
    notificationId: string,
    requesterId?: string | null,
): Promise<void> {
    const userId = await getForumSessionUserId(requesterId);
    if (!userId) return;

    await persistForumNotificationDismiss(userId, notificationId);

    if (typeof window !== 'undefined') {
        const remaining = await countForumUnread(userId);
        emitForumUnreadCount(remaining, { refresh: true });
    }
}
