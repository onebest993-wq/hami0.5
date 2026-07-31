import {
    loadRepositoryHubModule,
    prefetchRepositoryHubModule,
} from '@/app/runtime/repositoryHubLoader';

export function loadRepositoryIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/repositoryIntentWarm');
}

export function loadRepositoryBootHydrator() {
    return import('@/app/runtime/repositoryBootHydrator');
}

/** Matches repositoryBootHydrator — محلي لتفادي سحب stem عند الاستيراد */
export const REPOSITORY_PRIME_HOST_EVENT = 'hami:repository-prime-host';
export const REPOSITORY_SHELL_HYDRATED_EVENT = 'hami:repository-shell-hydrated';

/** Prefetch طبقات الـ Suspense (Entry + Host) قبل النقر */
export function prefetchRepositoryOverlayChunks(): void {
    if (typeof window === 'undefined') return;
    void import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardRepositoryOverlayEntry'
    ).catch(() => undefined);
    void import('@/app/components/lawyer/SmartRepository/SmartRepositoryHost').catch(() => undefined);
}

export function prefetchRepositoryHubAndOverlay(): void {
    prefetchRepositoryHubModule();
    prefetchRepositoryOverlayChunks();
    void loadRepositoryHubModule().catch(() => undefined);
}
