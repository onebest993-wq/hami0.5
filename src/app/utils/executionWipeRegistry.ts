import SecureStoreService from '@/app/services/SecureStoreService';
import { storageCache } from '@/app/utils/storageCache';
import { bindExecutionFilesStorageOwner } from '@/app/utils/executionFilesStorage';
import { stripExecutionDeviceStorageUserScope } from '@/app/utils/executionDeviceStorageScope';

export const EXECUTION_WIPE_KEY_PREFIXES = [
    'execution_',
    'garnishment_',
    'hami_garnishment_',
    'hami_unified_funds_ledger_',
    'hami_party_badges_hidden_',
    'hami_eviction_grace_',
    'hami:employee_personal_unlock',
] as const;

function matchesExecutionWipePrefix(key: string): boolean {
    const k = String(key ?? '').trim();
    if (!k) return false;
    const base = stripExecutionDeviceStorageUserScope(k);
    return EXECUTION_WIPE_KEY_PREFIXES.some((prefix) => base.startsWith(prefix));
}

function matchesScopedExecutionWipeKey(key: string): boolean {
    const k = String(key ?? '').trim();
    if (!k.includes(':u:')) return false;
    return matchesExecutionWipePrefix(k);
}

export function shouldPurgeExecutionLocalKey(key: string): boolean {
    return matchesExecutionWipePrefix(key) || matchesScopedExecutionWipeKey(key);
}

export async function purgeExecutionLocalStateOnLogout(): Promise<void> {
    const keys = new Set<string>(await SecureStoreService.listKeys());

    try {
        if (typeof globalThis.localStorage !== 'undefined') {
            const ls = globalThis.localStorage;
            for (let i = 0; i < ls.length; i += 1) {
                const k = String(ls.key(i) || '').trim();
                if (k) keys.add(k);
            }
        }
    } catch {
        /* best effort */
    }

    const toDelete = [...keys].filter(shouldPurgeExecutionLocalKey);
    await Promise.all(toDelete.map((k) => SecureStoreService.deleteItem(k)));

    try {
        if (typeof globalThis.localStorage !== 'undefined') {
            for (const k of toDelete) {
                globalThis.localStorage.removeItem(k);
            }
        }
    } catch {
        /* best effort */
    }

    try {
        storageCache.clear();
    } catch {
        /* best effort */
    }

    try {
        const { resetExecutionDashboardStore } = await import('@/app/stores/executionDashboardStoreLazy');
        await resetExecutionDashboardStore();
    } catch {
        /* best effort */
    }

    try {
        bindExecutionFilesStorageOwner(null);
    } catch {
        /* best effort */
    }
}
