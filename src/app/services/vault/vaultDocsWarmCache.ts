import { SmartVaultDB } from '@/app/services/vault/smartVaultRuntime';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { mergeSmartVaultDocs } from '@/app/services/vault/vaultDocUtils';
import { readVaultLocalIndexSync } from '@/app/services/vault/vaultLocalIndex';
import {
    mergeVaultDocsWarmCache,
    sortVaultDocs,
    SMART_VAULT_DOCS_UPDATED_EVENT,
    vaultDocsWarmCacheStore as cache,
    vaultDocsWarmInflightStore as inflight,
} from '@/app/services/vault/vaultDocsWarmState';
export {
    invalidateVaultDocsWarmCache,
    mergeVaultDocsWarmCache,
    peekVaultDocsWarmCache,
    removeVaultDocFromWarmCache,
    setVaultDocsWarmCache,
    SMART_VAULT_DOCS_UPDATED_EVENT,
} from '@/app/services/vault/vaultDocsWarmState';

export function notifySmartVaultDocsUpdated(userId: string, docs?: SmartVaultDoc[]): void {
    if (typeof window === 'undefined') return;
    const uid = userId.trim();
    if (!uid) return;
    window.dispatchEvent(
        new CustomEvent(SMART_VAULT_DOCS_UPDATED_EVENT, {
            detail: {
                userId: uid,
                docs: docs ?? [],
            },
        }),
    );
}

export function forceRefreshVaultDocs(userId: string): Promise<SmartVaultDoc[]> {
    const uid = userId.trim();
    if (!uid) return Promise.resolve([]);
    cache.delete(uid);
    inflight.delete(uid);
    return loadVaultDocsIntoCache(uid).catch(() => []);
}

function settleVaultDocsFailure(uid: string): SmartVaultDoc[] {
    return cache.get(uid) ?? [];
}

async function loadVaultDocsIntoCache(uid: string): Promise<SmartVaultDoc[]> {
    const pending = inflight.get(uid);
    if (pending) return pending;

    const run = SmartVaultDB.listDocs(uid)
        .then((fetched) => {
            const live = cache.get(uid);
            const merged = live?.length ? mergeSmartVaultDocs(live, fetched) : fetched;
            const sorted = sortVaultDocs(merged);
            cache.set(uid, sorted);
            return sorted;
        })
        .catch(() => settleVaultDocsFailure(uid))
        .finally(() => {
            inflight.delete(uid);
        });

    inflight.set(uid, run);
    return run;
}

/** جلب وثائق المخزن مع dedupe — لا يرفض أبداً (يُعيد [] عند الفشل) */
export function fetchVaultDocsDeduped(userId: string): Promise<SmartVaultDoc[]> {
    const uid = userId.trim();
    if (!uid) return Promise.resolve([]);
    const cached = cache.get(uid);
    if (cached?.length) {
        void loadVaultDocsIntoCache(uid).catch(() => undefined);
        return Promise.resolve(cached);
    }
    return loadVaultDocsIntoCache(uid).catch(() => cache.get(uid) ?? []);
}

/** انتظار تحديث كامل من التخزين — للواجهة التي تحتاج قائمة محدّثة */
export function refreshVaultDocsFromStore(userId: string): Promise<SmartVaultDoc[]> {
    const uid = userId.trim();
    if (!uid) return Promise.resolve([]);
    return loadVaultDocsIntoCache(uid).catch(() => cache.get(uid) ?? []);
}

/** بذر الكاش الدافئ من الفهرس المحلي الفوري */
export function seedVaultWarmCacheFromLocalIndex(userId: string): SmartVaultDoc[] {
    const uid = userId.trim();
    if (!uid) return [];
    const local = readVaultLocalIndexSync().filter((d) => d.authorId === uid);
    if (!local.length) return cache.get(uid) ?? [];
    return mergeVaultDocsWarmCache(uid, local);
}

/** تحميل مسبق لوثائق المخزن — يُستخدم عند hover/تشغيل اللوحة */
export function prefetchSmartVaultDocs(userId?: string | null): void {
    const uid = userId?.trim();
    if (!uid || typeof window === 'undefined') return;
    if (cache.get(uid)?.length) return;
    if (inflight.has(uid)) return;
    void loadVaultDocsIntoCache(uid).catch(() => undefined);
}
