import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import {
    mergeLegacyForumIntoModels,
    notificationBlobKey,
} from '@/app/services/notifications/notificationForumBlobOps';
import type { ForumNotification } from '@/app/services/forum/forumTypes';
import {
    deleteAllShellNotificationsSupabase,
    isShellNotificationSupabaseEnabled,
} from '@/app/services/notifications/notificationSupabaseInbox';
import {
    isShellNotificationKvCacheEnabled,
    shellNotificationPrimaryStore,
} from '@/app/services/notifications/notificationStoragePolicy';
import {
    kvDel,
    kvDelByPrefix,
    kvGetByPrefix,
    purgeKvBlobIfSupabaseOwns,
} from '@/app/services/notifications/inbox/notificationServerKvIo';
import { readBlob, writeBlob } from '@/app/services/notifications/inbox/notificationServerDualStore';

export async function readNotificationBlobServer(userId: string): Promise<NotificationModel[]> {
    return readBlob(userId);
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
