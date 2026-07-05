import { NotificationRepository } from '@/app/infrastructure/NotificationRepository';
import type { ForumNotification } from '@/app/services/forum/forumTypes';
import { mapForumNotificationToModel } from '@/app/services/notifications/forumNotificationMapper';
import { useNotificationStore } from '@/app/stores/notificationStore';
import {
    dismissForumNotificationInModels,
    extractForumNotificationsFromModels,
    markAllForumReadInModels,
    markForumReadInModels,
    patchForumInModels,
    upsertForumIntoModels,
} from '@/app/services/notifications/notificationForumBlobOps';
import { migrateLegacyForumKvToBlobIfNeeded, retryLegacyPrefixCleanupIfPartial } from '@/app/services/notifications/notificationForumKvMigration';

async function loadBlobModels(userId: string) {
    await migrateLegacyForumKvToBlobIfNeeded(
        userId,
        () => NotificationRepository.fetchNotifications(userId),
        async (models) => {
            await NotificationRepository.saveNotifications(userId, models);
        },
    );
    await retryLegacyPrefixCleanupIfPartial(userId).catch(() => undefined);
    return NotificationRepository.fetchNotifications(userId);
}

async function saveBlobModels(userId: string, models: Awaited<ReturnType<typeof loadBlobModels>>) {
    await NotificationRepository.saveNotifications(userId, models);
}

function syncStoreUpsert(notif: ForumNotification): void {
    if (typeof window === 'undefined') return;
    useNotificationStore.getState().upsertNotification(mapForumNotificationToModel(notif));
}

function syncStoreRemove(notificationId: string): void {
    if (typeof window === 'undefined') return;
    useNotificationStore.getState().removeNotification(notificationId);
}

function syncStoreFromBlob(userId: string, models: Awaited<ReturnType<typeof loadBlobModels>>): void {
    if (typeof window === 'undefined') return;
    const forumModels = extractForumNotificationsFromModels(models, userId).map(mapForumNotificationToModel);
    if (forumModels.length === 0) return;
    useNotificationStore.getState().upsertNotifications(forumModels);
}

/**
 * NotificationDB — تخزين موحّد عبر blob `notifications_${userId}`.
 * per-item keys (`notifications:${userId}:${id}`) legacy — تُدمَج ثم تُحذَف.
 */
export const NotificationDB = {
    async addNotification(notif: ForumNotification): Promise<void> {
        const models = await loadBlobModels(notif.userId);
        const next = upsertForumIntoModels(models, notif);
        await saveBlobModels(notif.userId, next);
        syncStoreUpsert(notif);
    },

    async updateNotification(
        userId: string,
        notificationId: string,
        patch: Partial<
            Pick<ForumNotification, 'title' | 'message' | 'read' | 'createdAt' | 'activityCount' | 'dedupeKey'>
        >,
    ): Promise<void> {
        const models = await loadBlobModels(userId);
        const next = patchForumInModels(models, userId, notificationId, patch);
        await saveBlobModels(userId, next);
        const updated = extractForumNotificationsFromModels(next, userId).find((n) => n.id === notificationId);
        if (updated) syncStoreUpsert(updated);
    },

    async getNotifications(userId: string): Promise<ForumNotification[]> {
        const models = await loadBlobModels(userId);
        return extractForumNotificationsFromModels(models, userId);
    },

    async markAsRead(notificationId: string, userId: string): Promise<void> {
        const models = await loadBlobModels(userId);
        const next = markForumReadInModels(models, userId, notificationId);
        await saveBlobModels(userId, next);
        syncStoreFromBlob(userId, next);
    },

    async markAllAsRead(userId: string): Promise<void> {
        const models = await loadBlobModels(userId);
        const next = markAllForumReadInModels(models, userId);
        await saveBlobModels(userId, next);
        syncStoreFromBlob(userId, next);
    },

    async getUnreadCount(userId: string): Promise<number> {
        const notifs = await this.getNotifications(userId);
        return notifs.filter((n) => !n.read).length;
    },

    async removeNotification(notificationId: string, userId: string): Promise<void> {
        const models = await loadBlobModels(userId);
        const next = dismissForumNotificationInModels(models, userId, notificationId);
        await saveBlobModels(userId, next);
        syncStoreRemove(notificationId);
    },
};
