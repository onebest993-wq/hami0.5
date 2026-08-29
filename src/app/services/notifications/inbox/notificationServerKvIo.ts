import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import { loadKvStoreAdmin } from '@/app/api/security/loadKvStoreAdmin';
import { capNotificationList } from '@/app/services/notifications/notificationLimits';
import {
    notificationBlobKey,
    parseNotificationBlob,
} from '@/app/services/notifications/notificationForumBlobOps';
import { isShellNotificationSupabaseEnabled } from '@/app/services/notifications/notificationSupabaseInbox';
import {
    isShellNotificationKvCacheEnabled,
    shouldPurgeKvBlobAfterBackfill,
} from '@/app/services/notifications/notificationStoragePolicy';

export async function kvGet(key: string): Promise<unknown> {
    const kv = await loadKvStoreAdmin();
    if (!kv) return null;
    return kv.kvGet(key);
}

export async function kvSet(key: string, value: unknown): Promise<void> {
    const kv = await loadKvStoreAdmin();
    if (!kv) throw new Error('KV admin unavailable');
    await kv.kvSet(key, value);
}

export async function kvDel(key: string): Promise<void> {
    const kv = await loadKvStoreAdmin();
    if (!kv) throw new Error('KV admin unavailable');
    await kv.kvDel(key);
}

export async function kvGetByPrefix(prefix: string): Promise<unknown[]> {
    const kv = await loadKvStoreAdmin();
    if (!kv) throw new Error('KV admin unavailable');
    return kv.kvGetByPrefix(prefix);
}

export async function kvDelByPrefix(prefix: string): Promise<number> {
    const kv = await loadKvStoreAdmin();
    if (!kv) throw new Error('KV admin unavailable');
    return kv.kvDelByPrefix(prefix);
}

export async function readKvBlob(userId: string): Promise<NotificationModel[]> {
    const raw = await kvGet(notificationBlobKey(userId));
    return parseNotificationBlob(raw);
}

export async function writeKvBlob(userId: string, models: NotificationModel[]): Promise<NotificationModel[]> {
    const capped = capNotificationList(models);
    await kvSet(notificationBlobKey(userId), capped);
    return capped;
}

export async function syncKvCacheOptional(userId: string, models: NotificationModel[]): Promise<void> {
    if (!isShellNotificationKvCacheEnabled()) return;
    await writeKvBlob(userId, models).catch(() => undefined);
}

export async function purgeKvBlobIfSupabaseOwns(userId: string, rows: NotificationModel[]): Promise<void> {
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
