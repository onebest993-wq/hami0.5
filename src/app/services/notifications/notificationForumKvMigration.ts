import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { isKvProxyNetworkEnabled } from '@/app/services/kvProxyConfig';
import { canUseServerBackedNetworkFeatures } from '@/app/services/auth/lawyerAccountStatus';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    clearLegacyPlaintextMirror,
    readSecureOrDrainLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import type { ForumNotification } from '@/app/services/forum/forumTypes';
import {
    mergeLegacyForumIntoModels,
    parseNotificationBlob,
} from '@/app/services/notifications/notificationForumBlobOps';

export const FORUM_KV_UNIFIED_MIGRATION_VERSION = 'v1';
const MIGRATION_FLAG_PREFIX = 'hami:notifications:kv-unified:';
const MERGED_IDS_PREFIX = 'hami:notifications:kv-unified:merged-ids:';
const LEGACY_GLOBAL_FORUM_LOCAL = 'hami:notifications:v1';
const DELETE_RETRY_ATTEMPTS = 5;
const DELETE_RETRY_DELAY_MS = 400;

function migrationFlagKey(userId: string): string {
    return `${MIGRATION_FLAG_PREFIX}${userId}:${FORUM_KV_UNIFIED_MIGRATION_VERSION}`;
}

function mergedIdsKey(userId: string): string {
    return `${MERGED_IDS_PREFIX}${userId}:${FORUM_KV_UNIFIED_MIGRATION_VERSION}`;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isValidForumNotification(value: unknown): value is ForumNotification {
    if (!value || typeof value !== 'object') return false;
    const o = value as Record<string, unknown>;
    return typeof o.id === 'string' && typeof o.userId === 'string';
}

function loadMergedLegacyIds(userId: string): Set<string> {
    try {
        const raw = readSecureOrDrainLegacySync(mergedIdsKey(userId));
        if (!raw) return new Set();
        const parsed = JSON.parse(raw) as string[];
        return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
        return new Set();
    }
}

function saveMergedLegacyIds(userId: string, ids: Set<string>): void {
    try {
        const key = mergedIdsKey(userId);
        SecureStoreService.setItemSync(key, JSON.stringify([...ids].slice(-500)));
        clearLegacyPlaintextMirror(key);
    } catch {
        /* ignore */
    }
}

function getMigrationFlag(userId: string): string | null {
    try {
        return readSecureOrDrainLegacySync(migrationFlagKey(userId));
    } catch {
        return null;
    }
}

function setMigrationFlag(userId: string, value: '1' | 'partial'): void {
    try {
        const key = migrationFlagKey(userId);
        SecureStoreService.setItemSync(key, value);
        clearLegacyPlaintextMirror(key);
    } catch {
        /* ignore */
    }
}

async function loadLegacyPrefixForumNotifications(userId: string): Promise<ForumNotification[]> {
    if (!isKvProxyNetworkEnabled() || !canUseServerBackedNetworkFeatures(userId)) return [];
    try {
        const res = await SecureAPIClient.fetchSecure<{ values?: unknown[] }>('/api/kv-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getByPrefix', prefix: `notifications:${userId}:` }),
        });
        const values = Array.isArray(res?.values) ? res.values : [];
        return values.filter(isValidForumNotification);
    } catch {
        return [];
    }
}

function loadLegacyGlobalLocalForum(userId: string): Set<string> {
    try {
        const raw = readSecureOrDrainLegacySync(LEGACY_GLOBAL_FORUM_LOCAL);
        if (!raw) return new Set();
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return new Set();
        return new Set(
            parsed
                .filter(isValidForumNotification)
                .filter((n) => n.userId === userId)
                .map((n) => n.id),
        );
    } catch {
        return new Set();
    }
}

async function deleteLegacyPrefixKeysOnce(userId: string): Promise<void> {
    if (!isKvProxyNetworkEnabled() || !canUseServerBackedNetworkFeatures(userId)) return;
    await SecureAPIClient.fetchSecure('/api/kv-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delByPrefix', prefix: `notifications:${userId}:` }),
    });
}

async function deleteLegacyPrefixKeysWithRetry(userId: string): Promise<boolean> {
    for (let attempt = 0; attempt < DELETE_RETRY_ATTEMPTS; attempt += 1) {
        try {
            await deleteLegacyPrefixKeysOnce(userId);
        } catch {
            /* retry */
        }
        const remaining = await loadLegacyPrefixForumNotifications(userId);
        if (remaining.length === 0) return true;
        if (attempt < DELETE_RETRY_ATTEMPTS - 1) {
            await sleep(DELETE_RETRY_DELAY_MS);
        }
    }
    return false;
}

function filterUnmergedLegacy(
    legacy: ForumNotification[],
    mergedIds: Set<string>,
): ForumNotification[] {
    return legacy.filter((n) => !mergedIds.has(n.id));
}

/** دمج per-item keys القديمة في blob — مع retry للحذف وتتبّع ids المدمجة. */
export async function migrateLegacyForumKvToBlobIfNeeded(
    userId: string,
    loadBlob: () => Promise<NotificationModel[]>,
    saveBlob: (models: NotificationModel[]) => Promise<void>,
): Promise<boolean> {
    const flag = getMigrationFlag(userId);
    if (flag === '1') return false;

    const mergedIds = loadMergedLegacyIds(userId);
    const prefixLegacy = filterUnmergedLegacy(await loadLegacyPrefixForumNotifications(userId), mergedIds);
    const localLegacyIds = loadLegacyGlobalLocalForum(userId);

    let localLegacy: ForumNotification[] = [];
    if (localLegacyIds.size > 0) {
        try {
            const raw = readSecureOrDrainLegacySync(LEGACY_GLOBAL_FORUM_LOCAL);
            const parsed: unknown = raw ? JSON.parse(raw) : [];
            if (Array.isArray(parsed)) {
                localLegacy = filterUnmergedLegacy(
                    parsed.filter(isValidForumNotification).filter((n) => n.userId === userId),
                    mergedIds,
                );
            }
        } catch {
            /* ignore */
        }
    }

    const legacy = [...prefixLegacy, ...localLegacy];
    if (legacy.length === 0) {
        if (flag !== 'partial') setMigrationFlag(userId, '1');
        return false;
    }

    const current = parseNotificationBlob(await loadBlob());
    const merged = mergeLegacyForumIntoModels(current, legacy);
    await saveBlob(merged);

    for (const n of legacy) mergedIds.add(n.id);
    saveMergedLegacyIds(userId, mergedIds);

    const deleted = await deleteLegacyPrefixKeysWithRetry(userId);
    setMigrationFlag(userId, deleted ? '1' : 'partial');

    return true;
}

export async function retryLegacyPrefixCleanupIfPartial(userId: string): Promise<boolean> {
    if (getMigrationFlag(userId) !== 'partial') return false;
    const deleted = await deleteLegacyPrefixKeysWithRetry(userId);
    if (deleted) setMigrationFlag(userId, '1');
    return deleted;
}
