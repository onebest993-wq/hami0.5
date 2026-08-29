import SecureStoreService from '@/app/services/SecureStoreService';
import { storageCache } from '@/app/utils/storageCache';
import { bindExecutionFilesStorageOwner } from '@/app/utils/executionFilesStorage';
import { stripExecutionDeviceStorageUserScope } from '@/app/utils/executionDeviceStorageScope';
import {
    EXECUTION_INDEX_WIPE_PREFIXES,
    EXECUTION_WIPE_EXACT_KEYS,
} from '@/app/utils/executionWipeKeyPrefixes';

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
    if ((EXECUTION_WIPE_EXACT_KEYS as readonly string[]).includes(base) ||
        (EXECUTION_WIPE_EXACT_KEYS as readonly string[]).includes(k)) {
        return true;
    }
    if (EXECUTION_INDEX_WIPE_PREFIXES.some((prefix) => base.startsWith(prefix) || k.startsWith(prefix))) {
        return true;
    }
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
    try {
        await SecureStoreService.waitForPendingSetItem();
    } catch {
        /* best effort — المسح لا يُعلَّق على كتابة معلّقة */
    }

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
    for (const k of toDelete) {
        try {
            SecureStoreService.deleteItemSync(k);
        } catch {
            /* ذاكرة فك التشفير قد تُعاد بعد كتابة معلّقة */
        }
    }

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
