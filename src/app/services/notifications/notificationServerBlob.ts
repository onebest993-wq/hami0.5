import { kvDel, kvGet, kvGetByPrefix, kvDelByPrefix, kvSet } from '@/app/api/security/kvStoreAdmin';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import { capNotificationList } from '@/app/services/notifications/notificationLimits';
import {
    capMergedNotificationLists,
    mergeNotificationRecord,
} from '@/app/services/notifications/notificationMerge';
import {
    notificationBlobKey,
    parseNotificationBlob,
    mergeLegacyForumIntoModels,
} from '@/app/services/notifications/notificationForumBlobOps';
import type { ForumNotification } from '@/app/services/forum/forumTypes';
import {
    deleteAllShellNotificationsSupabase,
    findShellNotificationByDedupeSupabase,
    isShellNotificationSupabaseEnabled,
    listShellNotificationsSupabase,
    markAllShellNotificationsReadSupabase,
    markShellNotificationReadSupabase,
    upsertShellNotificationSupabase,
    upsertShellNotificationsSupabase,
} from '@/app/services/notifications/notificationSupabaseInbox';
import {
    isShellNotificationKvCacheEnabled,
    shouldPurgeKvBlobAfterBackfill,
    shellNotificationPrimaryStore,
} from '@/app/services/notifications/notificationStoragePolicy';

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

async function readKvBlob(userId: string): Promise<NotificationModel[]> {
    const raw = await kvGet(notificationBlobKey(userId));
    return parseNotificationBlob(raw);
}

async function writeKvBlob(userId: string, models: NotificationModel[]): Promise<NotificationModel[]> {
    const capped = capNotificationList(models);
    await kvSet(notificationBlobKey(userId), capped);
    return capped;
}

async function syncKvCacheOptional(userId: string, models: NotificationModel[]): Promise<void> {
    if (!isShellNotificationKvCacheEnabled()) return;
    await writeKvBlob(userId, models).catch(() => undefined);
}

async function purgeKvBlobIfSupabaseOwns(userId: string, rows: NotificationModel[]): Promise<void> {
    if (
        !isShellNotificationSupabaseEnabled() ||
        !shouldPurgeKvBlobAfterBackfill() ||
        isShellNotificationKvCacheEnabled() ||
        rows.length === 0
    ) {
        return;
    }
    await kvDel(notificationBlobKey(userId)).catch(() => undefined);
}

async function ensureSupabaseInbox(userId: string): Promise<NotificationModel[]> {
    let rows = await listShellNotificationsSupabase(userId);
    if (rows.length > 0) {
        await purgeKvBlobIfSupabaseOwns(userId, rows);
        return rows;
    }

    const kvModels = await readKvBlob(userId);
    if (kvModels.length === 0) return [];

    await upsertShellNotificationsSupabase(userId, kvModels, 'merged').catch(() => undefined);
    rows = await listShellNotificationsSupabase(userId);

    if (shouldPurgeKvBlobAfterBackfill()) {
        await kvDel(notificationBlobKey(userId)).catch(() => undefined);
    }

    return rows;
}

async function readBlob(userId: string): Promise<NotificationModel[]> {
    if (isShellNotificationSupabaseEnabled()) {
        const rows = await ensureSupabaseInbox(userId);
        if (rows.length > 0 || !isShellNotificationKvCacheEnabled()) {
            return rows;
        }
    }
    return readKvBlob(userId);
}

async function writeBlob(userId: string, models: NotificationModel[]): Promise<NotificationModel[]> {
    const capped = capNotificationList(models);

    if (isShellNotificationSupabaseEnabled()) {
        const saved = await upsertShellNotificationsSupabase(userId, capped, 'merged');
        if (saved.length > 0) {
            await syncKvCacheOptional(userId, saved);
            return saved;
        }
    }

    return writeKvBlob(userId, capped);
}

export async function appendIncomingNotificationServer(
    userId: string,
    input: AppendIncomingNotificationInput,
): Promise<NotificationModel> {
    const payload = {
        ...(input.actionPayload ?? {}),
        ...(input.dedupeKey ? { dedupeKey: input.dedupeKey } : {}),
        appendedBy: 'server',
    };

    let byDedupe: NotificationModel | undefined;
    if (input.dedupeKey && isShellNotificationSupabaseEnabled()) {
        byDedupe =
            (await findShellNotificationByDedupeSupabase(userId, input.dedupeKey)) ?? undefined;
    }
    if (!byDedupe) {
        const existing = await readBlob(userId);
        byDedupe = input.dedupeKey
            ? existing.find(
                  (n) =>
                      (n.actionPayload as Record<string, unknown> | undefined)?.dedupeKey ===
                      input.dedupeKey,
              )
            : undefined;
    }

    const id = byDedupe?.id ?? input.id ?? makeServerId(input.category ?? 'system');
    const incoming: NotificationModel = {
        id,
        title: input.title,
        message: input.message,
        type: input.type,
        category: input.category,
        direction: input.direction ?? 'incoming',
        isRead: false,
        actionPayload: payload,
        createdAt: serverNowIso(),
    };

    const mergedRecord = byDedupe ? mergeNotificationRecord(byDedupe, incoming) : incoming;

    if (isShellNotificationSupabaseEnabled()) {
        await upsertShellNotificationSupabase(
            userId,
            mergedRecord,
            byDedupe ? 'updated' : 'created',
        ).catch(() => undefined);
        await syncKvCacheOptional(userId, await listShellNotificationsSupabase(userId));
        return incoming;
    }

    const existing = await readKvBlob(userId);
    const merged = byDedupe
        ? existing.map((n) => (n.id === id ? mergeNotificationRecord(n, incoming) : n))
        : capMergedNotificationLists(existing, [incoming]);

    await writeKvBlob(userId, merged);
    return incoming;
}

export async function upsertNotificationModelsServer(
    userId: string,
    models: NotificationModel[],
): Promise<NotificationModel[]> {
    const existing = await readBlob(userId);
    const merged = capMergedNotificationLists(existing, models);
    return writeBlob(userId, merged);
}

export async function readNotificationBlobServer(userId: string): Promise<NotificationModel[]> {
    return readBlob(userId);
}

export async function saveNotificationBlobServer(
    userId: string,
    models: NotificationModel[],
): Promise<NotificationModel[]> {
    return writeBlob(userId, models);
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
    if (incoming.length === 0) return readBlob(userId);
    const existing = await readBlob(userId);
    const merged = capMergedNotificationLists(existing, incoming);
    return writeBlob(userId, merged);
}

export async function listNotificationsServer(userId: string): Promise<NotificationModel[]> {
    await cleanupLegacyForumPrefixServer(userId).catch(() => undefined);
    const rows = await readBlob(userId);
    await purgeKvBlobIfSupabaseOwns(userId, rows);
    return rows;
}

export type ShellNotificationStorageMeta = {
    primary: ReturnType<typeof shellNotificationPrimaryStore>;
    kvCache: boolean;
};

export function getShellNotificationStorageMeta(): ShellNotificationStorageMeta {
    return {
        primary: shellNotificationPrimaryStore(),
        kvCache: isShellNotificationKvCacheEnabled(),
    };
}

export async function wipeShellNotificationsServer(userId: string): Promise<boolean> {
    let ok = true;

    if (isShellNotificationSupabaseEnabled()) {
        ok = (await deleteAllShellNotificationsSupabase(userId)) && ok;
    }

    try {
        await kvDel(notificationBlobKey(userId));
    } catch {
        ok = false;
    }

    try {
        await kvDelByPrefix(`notifications:${userId}:`);
    } catch {
        /* best effort */
    }

    return ok;
}

function isValidForumNotification(value: unknown): value is ForumNotification {
    if (!value || typeof value !== 'object') return false;
    const o = value as Record<string, unknown>;
    return typeof o.id === 'string' && typeof o.userId === 'string';
}

export async function cleanupLegacyForumPrefixServer(userId: string): Promise<number> {
    const prefix = `notifications:${userId}:`;
    try {
        const values = await kvGetByPrefix(prefix);
        const legacy = values.filter(isValidForumNotification);
        if (legacy.length === 0) return 0;

        const models = await readBlob(userId);
        const merged = mergeLegacyForumIntoModels(models, legacy);
        await writeBlob(userId, merged);
        return await kvDelByPrefix(prefix);
    } catch {
        return -1;
    }
}
