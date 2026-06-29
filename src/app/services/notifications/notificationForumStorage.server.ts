import { kvGetByPrefix } from '@/app/api/security/kvStoreAdmin';
import type { ForumNotification } from '@/app/services/lawyer-cloud';
import { mapForumNotificationToModel } from '@/app/services/notifications/forumNotificationMapper';
import {
    extractForumNotificationsFromModels,
    markAllForumReadInModels,
    markForumReadInModels,
    patchForumInModels,
    upsertForumIntoModels,
} from '@/app/services/notifications/notificationForumBlobOps';
import {
    readNotificationBlobServer,
    saveNotificationBlobServer,
    upsertNotificationModelsServer,
    cleanupLegacyForumPrefixServer,
} from '@/app/services/notifications/notificationServerBlob';

function withServerTimestamp(notif: ForumNotification): ForumNotification {
    return {
        ...notif,
        createdAt: new Date().toISOString(),
    };
}

/** NotificationDB على الخادم — blob موحّد + طابع زمني خادمي. */
export const ServerNotificationDB = {
    async getNotifications(userId: string): Promise<ForumNotification[]> {
        await cleanupLegacyForumPrefixServer(userId).catch(() => undefined);
        const models = await readNotificationBlobServer(userId);
        return extractForumNotificationsFromModels(models, userId);
    },

    async getUnreadCount(userId: string): Promise<number> {
        const rows = await this.getNotifications(userId);
        return rows.filter((n) => !n.read).length;
    },

    async markAsRead(notificationId: string, userId: string): Promise<void> {
        const models = await readNotificationBlobServer(userId);
        const next = markForumReadInModels(models, userId, notificationId);
        await saveNotificationBlobServer(userId, next);
    },

    async markAllAsRead(userId: string): Promise<void> {
        const models = await readNotificationBlobServer(userId);
        const next = markAllForumReadInModels(models, userId);
        await saveNotificationBlobServer(userId, next);
    },

    async addNotification(notif: ForumNotification): Promise<void> {
        const stamped = withServerTimestamp(notif);
        const models = await readNotificationBlobServer(stamped.userId);
        const next = upsertForumIntoModels(models, stamped);
        await saveNotificationBlobServer(stamped.userId, next);
    },

    async updateNotification(
        userId: string,
        notificationId: string,
        patch: Partial<
            Pick<ForumNotification, 'title' | 'message' | 'read' | 'createdAt' | 'activityCount' | 'dedupeKey'>
        >,
    ): Promise<void> {
        const models = await readNotificationBlobServer(userId);
        const next = patchForumInModels(models, userId, notificationId, {
            ...patch,
            createdAt: patch.createdAt ?? new Date().toISOString(),
        });
        await saveNotificationBlobServer(userId, next);
    },

    async upsertModelsFromForum(notifs: ForumNotification[]): Promise<void> {
        if (notifs.length === 0) return;
        const userId = notifs[0]!.userId;
        const models = notifs.map(mapForumNotificationToModel);
        await upsertNotificationModelsServer(userId, models);
    },
};

export async function countLegacyPrefixKeysServer(userId: string): Promise<number> {
    try {
        const values = await kvGetByPrefix(`notifications:${userId}:`);
        return Array.isArray(values) ? values.length : 0;
    } catch {
        return -1;
    }
}
