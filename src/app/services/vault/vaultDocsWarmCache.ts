import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';

const cache = new Map<string, SmartVaultDoc[]>();
const inflight = new Map<string, Promise<SmartVaultDoc[]>>();

export function peekVaultDocsWarmCache(userId: string): SmartVaultDoc[] | undefined {
    const uid = userId.trim();
    return uid ? cache.get(uid) : undefined;
}

export function setVaultDocsWarmCache(userId: string, docs: SmartVaultDoc[]): void {
    const uid = userId.trim();
    if (uid) cache.set(uid, docs);
}

export function invalidateVaultDocsWarmCache(userId?: string): void {
    if (userId?.trim()) cache.delete(userId.trim());
    else cache.clear();
}

async function loadVaultDocsIntoCache(uid: string): Promise<SmartVaultDoc[]> {
    const cached = cache.get(uid);
    if (cached) return cached;

    const pending = inflight.get(uid);
    if (pending) return pending;

    const run = import('@/app/services/lawyer-cloud')
        .then((m) => m.SmartVaultDB.listDocs(uid))
        .then((docs) => {
            cache.set(uid, docs);
            return docs;
        })
        .finally(() => {
            inflight.delete(uid);
        });

    inflight.set(uid, run);
    return run;
}

/** جلب وثائق المخزن مع dedupe — SWR-friendly */
export function fetchVaultDocsDeduped(userId: string): Promise<SmartVaultDoc[]> {
    const uid = userId.trim();
    if (!uid) return Promise.resolve([]);
    return loadVaultDocsIntoCache(uid);
}

/** تحميل مسبق لوثائق المخزن — يُستخدم عند hover/تشغيل اللوحة */
export function prefetchSmartVaultDocs(userId?: string | null): void {
    const uid = userId?.trim();
    if (!uid || typeof window === 'undefined') return;
    if (cache.has(uid) || inflight.has(uid)) return;
    void loadVaultDocsIntoCache(uid).catch(() => undefined);
}
