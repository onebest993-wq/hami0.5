import { supabase } from '@/app/lib/supabase-client';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { clearStoredBiometricCredential } from '@/app/services/security/webAuthnLock';
import SecureStoreService from '@/app/services/SecureStoreService';
import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { isKvProxyNetworkEnabled } from '@/app/services/kvProxyConfig';
import { clearAllVaultBlobs } from '@/app/services/vaultBlobStore';
import { invalidateLawyerSettingsCache, persistWallpaper } from '@/app/services/settings';
import { runBypassingLocalOnly } from '@/app/services/settings/localOnlyGuard';

const KV_PROXY_URL = '/api/kv-proxy';

type KvProxyKeysResponse = { ok?: boolean; keys?: string[] };
type KvProxyDelPrefixResponse = { ok?: boolean; deleted?: number };

function userCloudPrefixes(userId: string): string[] {
    return [
        `user:${userId}:`,
        `calendar:${userId}:`,
        `lawyer_files:${userId}:`,
        `urgentActions:${userId}:`,
        `transactions:${userId}:`,
        `transactionsThreading:${userId}:`,
        `notifications:${userId}:`,
        `vault:docs:${userId}:`,
        `follow:${userId}:`,
    ];
}

function userCloudSingleKeys(userId: string): string[] {
    return [
        `notifications_${userId}`,
        `hami:push:${userId}`,
        `hami:calendar:events:${userId}:v1`,
        `profile:${userId}`,
    ];
}

async function kvDelByPrefix(prefix: string): Promise<number> {
    const res = await SecureAPIClient.fetchSecure<KvProxyDelPrefixResponse>(KV_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delByPrefix', prefix }),
    });
    return typeof res?.deleted === 'number' ? res.deleted : 0;
}

async function kvDel(key: string): Promise<void> {
    await SecureAPIClient.fetchSecure(KV_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'del', key }),
    });
}

async function kvListKeysByPrefix(prefix: string): Promise<string[]> {
    const res = await SecureAPIClient.fetchSecure<KvProxyKeysResponse>(KV_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listKeysByPrefix', prefix }),
    });
    return Array.isArray(res?.keys) ? res.keys : [];
}

async function wipeUserCommunityContent(userId: string): Promise<void> {
    const keys = await kvListKeysByPrefix('community:posts:');
    for (const key of keys) {
        try {
            const res = await SecureAPIClient.fetchSecure<{ ok?: boolean; value?: unknown }>(KV_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get', key }),
            });
            const value = res?.value;
            const authorId =
                value && typeof value === 'object' && 'authorId' in value
                    ? String((value as { authorId?: unknown }).authorId ?? '')
                    : '';
            if (authorId === userId) {
                await kvDel(key);
            }
        } catch {
            /* best effort */
        }
    }
}

async function wipeCloudDataForUser(userId: string): Promise<void> {
    if (!isKvProxyNetworkEnabled()) return;

    await runBypassingLocalOnly(async () => {
        for (const prefix of userCloudPrefixes(userId)) {
            try {
                await kvDelByPrefix(prefix);
            } catch {
                /* best effort */
            }
        }

        for (const key of userCloudSingleKeys(userId)) {
            try {
                await kvDel(key);
            } catch {
                /* best effort */
            }
        }

        try {
            await wipeUserCommunityContent(userId);
        } catch {
            /* best effort */
        }
    });
}

function clearBrowserStorage(): void {
    const prefixes = ['hami_', 'hami:', 'lawyer_', 'execution_', 'lawsuit_', 'client_', 'notes_', 'cache_'];

    try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (!k) continue;
            if (k === 'lawyer_wallpaper' || prefixes.some((p) => k.startsWith(p))) {
                localStorage.removeItem(k);
            }
        }
    } catch {
        /* ignore */
    }

    try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const k = sessionStorage.key(i);
            if (!k) continue;
            if (prefixes.some((p) => k.startsWith(p))) {
                sessionStorage.removeItem(k);
            }
        }
    } catch {
        /* ignore */
    }
}

async function wipeLocalSecureStore(): Promise<void> {
    try {
        const keys = await SecureStoreService.listKeys();
        await Promise.all(keys.map((k) => SecureStoreService.deleteItem(k).catch(() => undefined)));
    } catch {
        /* ignore */
    }
}

export type ApplicationWipeResult = {
    cloudAttempted: boolean;
    userId: string | null;
};

/** مسح شامل: تخزين محلي + سحابة KV للمستخدم الحالي (best effort). */
export async function wipeAllApplicationData(
    resetToDefaults: () => void,
): Promise<ApplicationWipeResult> {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id?.trim() ?? null;

    if (userId) {
        try {
            await wipeCloudDataForUser(userId);
        } catch {
            /* local wipe continues */
        }
    }

    try {
        persistenceRepository.clear();
    } catch {
        /* ignore */
    }

    clearStoredBiometricCredential();
    persistWallpaper(undefined);
    clearBrowserStorage();
    await wipeLocalSecureStore();

    try {
        await clearAllVaultBlobs();
    } catch {
        /* ignore */
    }

    resetToDefaults();
    invalidateLawyerSettingsCache();
    window.dispatchEvent(new Event('hami:data-cleared'));

    return {
        cloudAttempted: Boolean(userId && isKvProxyNetworkEnabled()),
        userId,
    };
}
