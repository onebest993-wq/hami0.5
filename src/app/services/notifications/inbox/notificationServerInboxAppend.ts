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
} from '@/app/services/notifications/notificationInboxSanitize';
import {
    sanitizeNotificationActionPayload,
    sanitizeNotificationEntityId,
} from '@/app/services/notifications/notificationNavigateSecurity';
import {
    findShellNotificationByDedupeSupabase,
    isShellNotificationSupabaseEnabled,
    listShellNotificationsSupabase,
    upsertShellNotificationSupabase,
} from '@/app/services/notifications/notificationSupabaseInbox';
import {
    readKvBlob,
    syncKvCacheOptional,
    writeKvBlob,
} from '@/app/services/notifications/inbox/notificationServerKvIo';
import { readBlob } from '@/app/services/notifications/inbox/notificationServerDualStore';
import { serverNowIso } from '@/app/services/notifications/inbox/notificationServerInboxOps';

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

function makeServerId(prefix: string): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function findExistingByDedupe(
    userId: string,
    dedupeKey: string | undefined,
): Promise<NotificationModel | undefined> {
    if (!dedupeKey) return undefined;
    if (isShellNotificationSupabaseEnabled()) {
        const fromSupabase = await findShellNotificationByDedupeSupabase(userId, dedupeKey);
        if (fromSupabase) return fromSupabase;
    }
    const existing = await readBlob(userId);
    return existing.find(
        (n) => (n.actionPayload as Record<string, unknown> | undefined)?.dedupeKey === dedupeKey,
    );
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

export async function appendIncomingNotificationServer(
    userId: string,
    input: AppendIncomingNotificationInput,
): Promise<NotificationModel> {
    const dedupeKey = sanitizeNotificationDedupeKey(input.dedupeKey);
    const byDedupe = await findExistingByDedupe(userId, dedupeKey);
    const id =
        byDedupe?.id ??
        sanitizeNotificationEntityId(input.id) ??
        makeServerId(input.category ?? 'system');
    const incoming: NotificationModel = {
        id,
        title: clampNotificationInboxText(input.title, MAX_NOTIFICATION_TITLE_LEN),
        message: clampNotificationInboxText(input.message, MAX_NOTIFICATION_MESSAGE_LEN),
        type: input.type,
        category: input.category,
        direction: input.direction ?? 'incoming',
        isRead: false,
        actionPayload: {
            ...sanitizeNotificationActionPayload(input.actionPayload),
            ...(dedupeKey ? { dedupeKey } : {}),
            appendedBy: 'server',
        },
        createdAt: serverNowIso(),
    };

    const mergedRecord = byDedupe ? mergeNotificationRecord(byDedupe, incoming) : incoming;
    await persistIncomingRecord(userId, id, incoming, mergedRecord, byDedupe);
    void import('@/app/services/notifications/fcm/fcmInboxDispatch.server').then((m) =>
        m.dispatchFcmForShellNotification(userId, mergedRecord),
    );
    return incoming;
}
