import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import { deriveNotificationCategory } from '@/app/infrastructure/NotificationRepository';
import {
    mapForumNotificationToModel,
    mapModelToForumNotification,
} from '@/app/services/notifications/forumNotificationMapper';
import { capMergedNotificationLists, mergeNotificationRecord } from '@/app/services/notifications/notificationMerge';
import type { ForumNotification } from '@/app/services/forum/forumTypes';

export const NOTIFICATION_BLOB_KEY_PREFIX = 'notifications_';

export function notificationBlobKey(userId: string): string {
    return `${NOTIFICATION_BLOB_KEY_PREFIX}${userId}`;
}

export function parseNotificationBlob(raw: unknown): NotificationModel[] {
    return Array.isArray(raw) ? (raw as NotificationModel[]) : [];
}

export function extractForumNotificationsFromModels(
    models: NotificationModel[],
    userId: string,
): ForumNotification[] {
    return models
        .map((model) => mapModelToForumNotification(model, userId))
        .filter((n): n is ForumNotification => n != null)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function upsertForumIntoModels(
    models: NotificationModel[],
    forumNotif: ForumNotification,
): NotificationModel[] {
    const incoming = mapForumNotificationToModel(forumNotif);
    const existing = models.find((n) => n.id === incoming.id);
    if (!existing) {
        return capMergedNotificationLists(models, [incoming]);
    }
    return models.map((n) => (n.id === incoming.id ? mergeNotificationRecord(n, incoming) : n));
}

export function patchForumInModels(
    models: NotificationModel[],
    userId: string,
    notificationId: string,
    patch: Partial<Pick<ForumNotification, 'title' | 'message' | 'read' | 'createdAt' | 'activityCount' | 'dedupeKey'>>,
): NotificationModel[] {
    const forum = extractForumNotificationsFromModels(models, userId).find((n) => n.id === notificationId);
    if (!forum) return models;

    const updatedForum: ForumNotification = {
        ...forum,
        ...patch,
        read: patch.read ?? forum.read,
    };

    return upsertForumIntoModels(
        models.filter((n) => n.id !== notificationId),
        updatedForum,
    );
}

export function markForumReadInModels(
    models: NotificationModel[],
    userId: string,
    notificationId: string,
): NotificationModel[] {
    return patchForumInModels(models, userId, notificationId, { read: true });
}

export function markAllForumReadInModels(models: NotificationModel[], userId: string): NotificationModel[] {
    return models.map((n) =>
        deriveNotificationCategory(n) === 'forum' ? { ...n, isRead: true } : n,
    );
}

export function dismissForumNotificationInModels(
    models: NotificationModel[],
    userId: string,
    notificationId: string,
): NotificationModel[] {
    return models.filter((n) => {
        if (n.id !== notificationId) return true;
        const forum = mapModelToForumNotification(n, userId);
        return forum == null;
    });
}

export function mergeLegacyForumIntoModels(
    models: NotificationModel[],
    legacyForum: ForumNotification[],
): NotificationModel[] {
    let next = models;
    for (const forumNotif of legacyForum) {
        next = upsertForumIntoModels(next, forumNotif);
    }
    return next;
}

export function isForumModel(n: NotificationModel): boolean {
    return deriveNotificationCategory(n) === 'forum';
}
