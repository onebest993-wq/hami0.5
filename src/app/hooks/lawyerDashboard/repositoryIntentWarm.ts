import {
    prefetchSmartVaultDocs,
    refreshVaultDocsFromStore,
    seedVaultWarmCacheFromLocalIndex,
} from '@/app/services/vault/vaultDocsWarmCache';
import { prefetchRepositoryHubModule } from '@/app/runtime/repositoryHubLoader';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';

let registeredWarmUserId: string | null | undefined;
let repositoryIdleScheduled = false;

function prefetchSmartRepositoryModalIntent(): void {
    void import('@/app/utils/lazyComponentsIntent')
        .then((m) => m.prefetchSmartRepositoryModal())
        .catch(() => undefined);
}

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
    prefetchSmartRepositoryModalIntent();
    if (typeof window !== 'undefined') {
        void import('@/app/components/lawyer/SmartRepository/SmartRepositoryHost').catch(() => undefined);
        void import(
            '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardRepositoryOverlayEntry'
        ).catch(() => undefined);
    }
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
    prefetchRepositoryHubModule();
    if (typeof window !== 'undefined') {
        void import('@/app/components/lawyer/SmartRepository/SmartRepositoryHost').catch(() => undefined);
        void import(
            '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardRepositoryOverlayEntry'
        ).catch(() => undefined);
    }
    const uid = userId ?? registeredWarmUserId;
    if (uid) prefetchSmartVaultDocs(uid);
    if (tab === 'notepad') prefetchSmartRepositoryModalIntent();
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
