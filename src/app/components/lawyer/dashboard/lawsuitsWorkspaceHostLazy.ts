import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

/**
 * Host مساحة الدعاوى — preload-aware حتى لا يعلق Suspense بعد تسخين الوحدة.
 */
export const LazyLawsuitsWorkspaceHost = createPreloadableLazyComponent(() =>
    import('@/app/components/lawyer/dashboard/LawsuitsWorkspaceHost').then((m) => ({
        default: m.LawsuitsWorkspaceHost as unknown as LazyComponent,
    })),
);

export function prefetchLawsuitsWorkspaceHost(): void {
    if (typeof window === 'undefined') return;
    void LazyLawsuitsWorkspaceHost.preload();
}
