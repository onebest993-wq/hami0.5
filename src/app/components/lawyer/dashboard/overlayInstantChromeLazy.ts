/**
 * أغطية الطلاء الفوري للكِسَر — preload-aware حتى لا يعلّق غطاء Suspense
 * إطاراً بعد اكتمال التسخين.
 */
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

export const LazyExecutionArchiveInstantChrome = createPreloadableLazyComponent(() =>
    import('@/app/components/lawyer/dashboard/ExecutionArchiveInstantChrome').then((m) => ({
        default: m.ExecutionArchiveInstantChrome as unknown as LazyComponent,
    })),
);

export const LazyCriminalDashboardBootChrome = createPreloadableLazyComponent(() =>
    import('@/app/components/lawyer/criminal-system/CriminalDashboardBootChrome').then((m) => ({
        default: m.CriminalDashboardBootChrome as unknown as LazyComponent,
    })),
);

export const LazyGlobalSearchInstantPaintCover = createPreloadableLazyComponent(() =>
    import('@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchInstantPaintCover').then((m) => ({
        default: m.GlobalSearchInstantPaintCover as unknown as LazyComponent,
    })),
);

export const LazyLawsuitsWorkspaceInstantChrome = createPreloadableLazyComponent(() =>
    import('@/app/components/lawyer/dashboard/LawsuitsWorkspaceInstantChrome').then((m) => ({
        default: m.LawsuitsWorkspaceInstantChrome as unknown as LazyComponent,
    })),
);
