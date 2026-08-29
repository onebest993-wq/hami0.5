import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import { capNotificationList } from '@/app/services/notifications/notificationLimits';
import { notificationBlobKey } from '@/app/services/notifications/notificationForumBlobOps';
import {
    isShellNotificationSupabaseEnabled,
    queryShellNotificationInbox,
    upsertShellNotificationsSupabase,
} from '@/app/services/notifications/notificationSupabaseInbox';
import { shouldPurgeKvBlobAfterBackfill } from '@/app/services/notifications/notificationStoragePolicy';
import {
    kvDel,
    purgeKvBlobIfSupabaseOwns,
    readKvBlob,
    syncKvCacheOptional,
    writeKvBlob,
} from '@/app/services/notifications/inbox/notificationServerKvIo';

async function ensureSupabaseInbox(userId: string): Promise<NotificationModel[]> {
    const listed = await queryShellNotificationInbox(userId);
    if (!listed.ok) {
        return readKvBlob(userId);
    }
    if (listed.rows.length > 0) {
        await purgeKvBlobIfSupabaseOwns(userId, listed.rows);
        return listed.rows;
    }

    const kvModels = await readKvBlob(userId);
    if (kvModels.length === 0) return [];

    const saved = await upsertShellNotificationsSupabase(userId, kvModels, 'merged');
    if (saved.length > 0) {
        if (shouldPurgeKvBlobAfterBackfill()) {
            await kvDel(notificationBlobKey(userId)).catch(() => undefined);
        }
        return saved;
    }

    return kvModels;
}

export async function readBlob(userId: string): Promise<NotificationModel[]> {
    if (isShellNotificationSupabaseEnabled()) {
        return ensureSupabaseInbox(userId);
    }
    return readKvBlob(userId);
}

export async function writeBlob(userId: string, models: NotificationModel[]): Promise<NotificationModel[]> {
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
