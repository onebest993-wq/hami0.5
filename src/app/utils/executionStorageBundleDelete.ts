import SecureStoreService from '@/app/services/SecureStoreService';
import { purgeExecutionStorageCache } from '@/app/utils/executionStorageCacheOps';
import {
    getExecutionStorageBundleKeys,
    normalizeExecutionStorageId,
    scopeExecutionDeviceStorageKey,
    stripExecutionDeviceStorageUserScope,
    unscopedExecutionStorageKey,
} from '@/app/utils/executionStorageKeysLite';
import { EXECUTION_WIPE_KEY_PREFIXES } from '@/app/utils/executionWipeKeyPrefixes';

const bundleDeletionInFlight = new Map<string, Promise<void>>();

function isKeyOwnedByExecutionBase(key: string, base: string): boolean {
    if (!base || !key.startsWith(base)) return false;
    const rest = key.slice(base.length);
    return rest === '' || rest.startsWith('_') || rest.startsWith(':');
}

function isKeyOwnedByDossierTail(key: string, id: string): boolean {
    if (!id || id === 'default') return false;
    if (!EXECUTION_WIPE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) return false;
    const unscoped = stripExecutionDeviceStorageUserScope(key);
    if (!unscoped.endsWith(id) || unscoped.length <= id.length) return false;
    const boundary = unscoped[unscoped.length - id.length - 1];
    return boundary === '_' || boundary === ':';
}

export async function removeExecutionStorageBundleAsync(executionId: string | undefined): Promise<void> {
    const id = normalizeExecutionStorageId(executionId);
    const existing = bundleDeletionInFlight.get(id);
    if (existing) {
        await existing;
        return;
    }
    const task = (async () => {
        const base = unscopedExecutionStorageKey(id);
        const scopedBase = scopeExecutionDeviceStorageKey(base);
        const keys = getExecutionStorageBundleKeys(id);
        await Promise.all(keys.map((k) => SecureStoreService.deleteItem(k)));
        const allKeys = await SecureStoreService.listKeys();
        await Promise.all(
            allKeys
                .filter(
                    (k) =>
                        isKeyOwnedByExecutionBase(k, base) ||
                        isKeyOwnedByExecutionBase(k, scopedBase) ||
                        isKeyOwnedByDossierTail(k, id),
                )
                .map((k) => SecureStoreService.deleteItem(k)),
        );
        purgeExecutionStorageCache(id);
    })();
    bundleDeletionInFlight.set(id, task);
    try {
        await task;
    } finally {
        if (bundleDeletionInFlight.get(id) === task) {
            bundleDeletionInFlight.delete(id);
        }
    }
}

export function removeExecutionStorageBundle(executionId: string | undefined): void {
    void (async () => {
        try {
            await removeExecutionStorageBundleAsync(executionId);
        } catch {
            /* ignore */
        }
    })();
}
