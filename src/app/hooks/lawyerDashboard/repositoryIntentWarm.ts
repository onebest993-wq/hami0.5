import { prefetchSmartRepositoryModal } from '@/app/utils/lazyComponents';
import {
    prefetchSmartVaultDocs,
    refreshVaultDocsFromStore,
    seedVaultWarmCacheFromLocalIndex,
} from '@/app/services/vault/vaultDocsWarmCache';
import { prefetchRepositoryHubModule } from '@/app/runtime/repositoryHubLoader';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';

let registeredWarmUserId: string | null | undefined;
let repositoryIdleScheduled = false;

export function resetRepositoryIdlePrefetchForTests(): void {
    repositoryIdleScheduled = false;
    registeredWarmUserId = undefined;
}

/** يسجّل userId للـ prefetch من البطاقات دون تمرير صريح */
export function registerRepositoryWarmUserId(userId: string | null | undefined): () => void {
    registeredWarmUserId = userId;
    return () => {
        if (registeredWarmUserId === userId) registeredWarmUserId = undefined;
    };
}

/** prefetch chunks + بيانات — hover/idle */
export function warmRepositoryHubOnHover(userId?: string | null): void {
    prefetchRepositoryHubModule();
    prefetchSmartRepositoryModal();
    const uid = (userId ?? registeredWarmUserId)?.trim();
    if (uid) prefetchSmartVaultDocs(uid);
}

export type RepositoryWarmTab = 'notepad' | 'vault';

/** تحميل مسبق لوثائق المخزن — يُنتظر عند الفتح */
export function warmRepositoryDataCache(userId?: string | null): Promise<SmartVaultDoc[]> {
    const uid = (userId ?? registeredWarmUserId)?.trim();
    if (!uid) return Promise.resolve([]);
    const seeded = seedVaultWarmCacheFromLocalIndex(uid);
    return refreshVaultDocsFromStore(uid).catch(() => seeded);
}

/** عند فتح المستودع — hub + وثائق + chunk المفكرة عند تبويب notepad */
export function warmRepositoryOnOpen(
    userId?: string | null,
    tab: RepositoryWarmTab = 'notepad',
): void {
    const uid = userId ?? registeredWarmUserId;
    prefetchRepositoryHubModule();
    if (uid) prefetchSmartVaultDocs(uid);
    if (tab === 'notepad') prefetchSmartRepositoryModal();
}

/** idle warm لبطاقة المستودع — cold open أخف بعد جاهزية الرئيسية */
export function scheduleRepositoryDockIdlePrefetch(): void {
    if (typeof window === 'undefined' || repositoryIdleScheduled) return;
    repositoryIdleScheduled = true;

    const run = () => warmRepositoryHubOnHover();

    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(run, { timeout: 5_000 });
    } else {
        window.setTimeout(run, 2_000);
    }
}
