import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import {
    capMergedNotificationLists,
    mergeNotificationRecord,
} from '@/app/services/notifications/notificationMerge';
import {
    clampNotificationInboxText,
    MAX_NOTIFICATION_MESSAGE_LEN,
    MAX_NOTIFICATION_TITLE_LEN,
    sanitizeNotificationDedupeKey,
    sanitizeNotificationModelForPersist,
} from '@/app/services/notifications/notificationInboxSanitize';
import {
    sanitizeNotificationActionPayload,
    sanitizeNotificationEntityId,
} from '@/app/services/notifications/notificationNavigateSecurity';
import {
    findShellNotificationByDedupeSupabase,
    isShellNotificationSupabaseEnabled,
    listShellNotificationsSupabase,
    markAllShellNotificationsReadSupabase,
    markShellNotificationReadSupabase,
    upsertShellNotificationSupabase,
} from '@/app/services/notifications/notificationSupabaseInbox';
import {
    readKvBlob,
    syncKvCacheOptional,
    writeKvBlob,
} from '@/app/services/notifications/inbox/notificationServerKvIo';
import { readBlob, writeBlob } from '@/app/services/notifications/inbox/notificationServerDualStore';

export type AppendIncomingNotificationInput = {
    id?: string;
    title: string;
    message: string;
    type: NotificationModel['type'];
    category?: NotificationModel['category'];
    direction?: NotificationModel['direction'];
    actionPayload?: Record<string, unknown>;
    dedupeKey?: string;
};

function serverNowIso(): string {
    return new Date().toISOString();
}

function makeServerId(prefix: string): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function appendIncomingNotificationServer(
    userId: string,
    input: AppendIncomingNotificationInput,
): Promise<NotificationModel> {
    const title = clampNotificationInboxText(input.title, MAX_NOTIFICATION_TITLE_LEN);
    const message = clampNotificationInboxText(input.message, MAX_NOTIFICATION_MESSAGE_LEN);
    const dedupeKey = sanitizeNotificationDedupeKey(input.dedupeKey);
    const payload: Record<string, unknown> = {
        ...sanitizeNotificationActionPayload(input.actionPayload),
        ...(dedupeKey ? { dedupeKey } : {}),
        appendedBy: 'server',
    };

    let byDedupe: NotificationModel | undefined;
    if (dedupeKey && isShellNotificationSupabaseEnabled()) {
        byDedupe =
            (await findShellNotificationByDedupeSupabase(userId, dedupeKey)) ?? undefined;
    }
    if (!byDedupe) {
        const existing = await readBlob(userId);
        byDedupe = dedupeKey
            ? existing.find(
                  (n) =>
                      (n.actionPayload as Record<string, unknown> | undefined)?.dedupeKey ===
                      dedupeKey,
              )
            : undefined;
    }

    const id =
        byDedupe?.id ??
        sanitizeNotificationEntityId(input.id) ??
        makeServerId(input.category ?? 'system');
    const incoming: NotificationModel = {
        id,
        title,
        message,
        type: input.type,
        category: input.category,
        direction: input.direction ?? 'incoming',
        isRead: false,
        actionPayload: payload,
        createdAt: serverNowIso(),
    };

    const mergedRecord = byDedupe ? mergeNotificationRecord(byDedupe, incoming) : incoming;

    const dispatchFcm = () => {
        void import('@/app/services/notifications/fcm/fcmInboxDispatch.server').then((m) =>
            m.dispatchFcmForShellNotification(userId, mergedRecord),
        );
    };

    await persistIncomingRecord(userId, id, incoming, mergedRecord, byDedupe);
    dispatchFcm();
    return incoming;
}

async function persistIncomingOnKv(
    userId: string,
    id: string,
    incoming: NotificationModel,
    byDedupe: NotificationModel | undefined,
): Promise<void> {
    const existing = await readKvBlob(userId);
    const merged = byDedupe
        ? existing.map((n) => (n.id === id ? mergeNotificationRecord(n, incoming) : n))
        : capMergedNotificationLists(existing, [incoming]);
    await writeKvBlob(userId, merged);
}

async function persistIncomingRecord(
    userId: string,
    id: string,
    incoming: NotificationModel,
    mergedRecord: NotificationModel,
    byDedupe: NotificationModel | undefined,
): Promise<void> {
    if (isShellNotificationSupabaseEnabled()) {
        try {
            const upserted = await upsertShellNotificationSupabase(
                userId,
                mergedRecord,
                byDedupe ? 'updated' : 'created',
            );
            if (upserted) {
                await syncKvCacheOptional(userId, await listShellNotificationsSupabase(userId));
                return;
            }
        } catch {
            /* صندوق Supabase غير جاهز — KV حتى لا يُفقد إشعار المقر */
        }
    }

    await persistIncomingOnKv(userId, id, incoming, byDedupe);
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
