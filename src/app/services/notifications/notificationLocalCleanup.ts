import SecureStoreService from '@/app/services/SecureStoreService';
import {
    FORUM_KV_UNIFIED_MIGRATION_VERSION,
} from '@/app/services/notifications/notificationForumKvMigration';
import { NOTIFICATION_LEGACY_PURGE_VERSION } from '@/app/services/notifications/notificationLegacyMigration';

const LOCAL_BLOB_PREFIX = 'hami:notifications:v1:';
const LEGACY_GLOBAL_FORUM = 'hami:notifications:v1';

function migrationFlagKey(userId: string): string {
    return `hami:notifications:kv-unified:${userId}:${FORUM_KV_UNIFIED_MIGRATION_VERSION}`;
}

function mergedIdsKey(userId: string): string {
    return `hami:notifications:kv-unified:merged-ids:${userId}:${FORUM_KV_UNIFIED_MIGRATION_VERSION}`;
}

function legacyPurgeKey(userId: string): string {
    return `hami:notifications:legacy-purged:${userId}:${NOTIFICATION_LEGACY_PURGE_VERSION}`;
}

/** مسح cache محلي للإشعارات (SecureStore) — أثناء wipe. */
export function clearLocalNotificationCache(userId: string | null): void {
    const keys = [
        LEGACY_GLOBAL_FORUM,
        ...(userId
            ? [
                  `${LOCAL_BLOB_PREFIX}${userId}`,
                  migrationFlagKey(userId),
                  mergedIdsKey(userId),
                  legacyPurgeKey(userId),
              ]
            : []),
    ];

    for (const key of keys) {
        try {
            SecureStoreService.deleteItemSync(key);
        } catch {
            /* ignore */
        }
    }
}

/** إعادة ضبط Zustand store للجرس. */
export async function resetNotificationStoreAfterWipe(): Promise<void> {
    if (typeof window === 'undefined') return;
    const { useNotificationStore } = await import('@/app/stores/notificationStore');
    useNotificationStore.getState().setUserId(null);
}
