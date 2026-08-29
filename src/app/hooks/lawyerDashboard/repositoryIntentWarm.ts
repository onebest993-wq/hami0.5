import {
    prefetchSmartVaultDocs,
    refreshVaultDocsFromStore,
    seedVaultWarmCacheFromLocalIndex,
} from '@/app/services/vault/vaultDocsWarmCache';
import { prefetchRepositoryHubModule } from '@/app/runtime/repositoryHubLoader';
import { isSectionBackgroundPrefetchAllowed } from '@/app/runtime/sectionPrefetchPolicy';
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

/** prefetch مقطع Entry + بيانات — hover/idle */
export function warmRepositoryHubOnHover(userId?: string | null): void {
    prefetchRepositoryHubModule();
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

/** عند فتح المستودع — نفس تسخين الـ hover (Entry + وثائق) */
export function warmRepositoryOnOpen(
    userId?: string | null,
    _tab: RepositoryWarmTab = 'notepad',
): void {
    warmRepositoryHubOnHover(userId);
}

/** idle warm لبطاقة المستودع — يُلغى على lite / توفير البيانات / localOnly */
export function scheduleRepositoryDockIdlePrefetch(): void {
    if (typeof window === 'undefined' || repositoryIdleScheduled) return;
    if (!isSectionBackgroundPrefetchAllowed()) return;
    repositoryIdleScheduled = true;

    const run = () => warmRepositoryHubOnHover();

    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(run, { timeout: 5_000 });
    } else {
        window.setTimeout(run, 2_000);
    }
}
