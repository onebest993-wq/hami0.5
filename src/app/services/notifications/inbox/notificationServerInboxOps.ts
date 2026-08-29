import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import { capMergedNotificationLists } from '@/app/services/notifications/notificationMerge';
import { sanitizeNotificationModelForPersist } from '@/app/services/notifications/notificationInboxSanitize';
import {
    isShellNotificationSupabaseEnabled,
    markAllShellNotificationsReadSupabase,
    markShellNotificationReadSupabase,
} from '@/app/services/notifications/notificationSupabaseInbox';
import {
    readKvBlob,
    syncKvCacheOptional,
    writeKvBlob,
} from '@/app/services/notifications/inbox/notificationServerKvIo';
import { readBlob, writeBlob } from '@/app/services/notifications/inbox/notificationServerDualStore';

export function serverNowIso(): string {
    return new Date().toISOString();
}

function persistableModels(models: NotificationModel[]): NotificationModel[] {
    return models
        .map((n) => sanitizeNotificationModelForPersist(n))
        .filter((n): n is NotificationModel => n != null);
}

export async function upsertNotificationModelsServer(
    userId: string,
    models: NotificationModel[],
): Promise<NotificationModel[]> {
    const existing = await readBlob(userId);
    const merged = capMergedNotificationLists(existing, persistableModels(models));
    return writeBlob(userId, merged);
}

export async function saveNotificationBlobServer(
    userId: string,
    models: NotificationModel[],
): Promise<NotificationModel[]> {
    return writeBlob(userId, persistableModels(models));
}

function payloadOf(n: NotificationModel): Record<string, unknown> {
    return n.actionPayload && typeof n.actionPayload === 'object' ? n.actionPayload : {};
}

function withReadSyncStamp(n: NotificationModel): NotificationModel {
    return {
        ...n,
        isRead: true,
        actionPayload: {
            ...payloadOf(n),
            readSyncedBy: 'server',
            readSyncedAt: serverNowIso(),
        },
    };
}

export async function markNotificationReadServer(
    userId: string,
    notificationId: string,
): Promise<NotificationModel[]> {
    if (isShellNotificationSupabaseEnabled()) {
        const list = await markShellNotificationReadSupabase(userId, notificationId);
        await syncKvCacheOptional(userId, list);
        return list;
    }

    const existing = await readKvBlob(userId);
    const updated = existing.map((n) =>
        n.id === notificationId ? withReadSyncStamp(n) : n,
    );
    return writeKvBlob(userId, updated);
}

export async function markAllNotificationsReadServer(userId: string): Promise<NotificationModel[]> {
    if (isShellNotificationSupabaseEnabled()) {
        const list = await markAllShellNotificationsReadSupabase(userId);
        await syncKvCacheOptional(userId, list);
        return list;
    }

    const existing = await readKvBlob(userId);
    const updated = existing.map((n) => (n.isRead ? n : withReadSyncStamp(n)));
    return writeKvBlob(userId, updated);
}

export async function mergeNotificationBlobServer(
    userId: string,
    incoming: NotificationModel[],
): Promise<NotificationModel[]> {
    const safeIncoming = persistableModels(incoming);
    if (safeIncoming.length === 0) return readBlob(userId);
    const existing = await readBlob(userId);
    const merged = capMergedNotificationLists(existing, safeIncoming);
    return writeBlob(userId, merged);
}
