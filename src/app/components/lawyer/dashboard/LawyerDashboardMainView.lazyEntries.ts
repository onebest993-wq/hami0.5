import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
export {
    LazyCommunityOverlayEntry,
    loadCommunityOverlayEntry,
} from '@/app/runtime/communityOverlayEntryLoader';
export {
    LazyScheduleTabHost,
    loadScheduleTabHostModule,
} from '@/app/runtime/scheduleHubLoader';
export { LazyNotificationShell } from '@/app/runtime/notificationShellLoader';
export { LazyRepositoryOverlayEntry } from '@/app/runtime/repositoryHubLoader';
export { LazyFieldTasksOverlayEntry, loadFieldTasksSheetModule } from '@/app/runtime/fieldTasksHubLoader';
export { LazyTransactionsOverlayEntry } from '@/app/runtime/transactionsHubLoader';
export {
    LazySmartFileOverlayEntry,
    loadSmartFileOverlayEntry,
} from '@/app/runtime/smartFileOverlayEntryLoader';
export {
    LazyLawsuitsOverlayEntry,
    loadLawsuitsOverlayEntry,
} from '@/app/runtime/lawsuitsOverlayEntryLoader';
export { LazyGlobalSearchOverlayEntry } from '@/app/runtime/globalSearchLoader';
export { LazyProfileTabHost, prefetchProfileTabHost } from '@/app/runtime/profileTabHostLoader';
export {
    LazyExecutionOverlayEntry,
    LazyExecutionDossierOverlayEntry,
    LazyExecutionCreateOverlayEntry,
} from '@/app/runtime/executionOverlayEntryLoader';
export {
    LazyCriminalOverlayEntry,
    LazyNewCaseOverlayEntry,
    LazyNonExecArchiveOverlayEntry,
} from '@/app/runtime/criminalOverlayEntryLoader';
export { stampMainViewOverlayEntryPreloads } from '@/app/runtime/overlayHeavyStamp';

/**
 * LawyerDashboardExecutionOverlayEntry / LawyerDashboardExecutionDossierOverlayEntry
 * LawyerDashboardCriminalOverlayEntry / LawyerDashboardNewCaseOverlayEntry
 * — محمّلات مستقلة حتى لا تجرّ الموجة الخفيفة برميل المنتدى/الجدول.
 */

/**
 * تعريفات Lazy لـ LawyerDashboardMainView — منفصلة لتقسيم الملف دون تغيير سلوك التركيب.
 * مداخل الأقسام الثقيلة في محمّلات مستقلة حتى لا تجرّ الموجة الخفيفة برميل المنتدى/الجدول.
 */

export const LazyLawyerDashboardPostInteractiveRuntime = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/LawyerDashboardPostInteractiveRuntime').then((m) => ({
        default: m.LawyerDashboardPostInteractiveRuntime as unknown as LazyComponent,
    })),
);

export const LazyLawyerDashboardDeferredFeatureSurfaces = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/LawyerDashboardDeferredFeatureSurfaces').then((m) => ({
        default: m.LawyerDashboardDeferredFeatureSurfaces as unknown as LazyComponent,
    })),
);

export const LazyLawyerDashboardFieldTasksFeatureSurfaces = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/LawyerDashboardFieldTasksFeatureSurfaces').then((m) => ({
        default: m.LawyerDashboardFieldTasksFeatureSurfaces as unknown as LazyComponent,
    })),
);

export const LazyLawyerDashboardPreDockFeatureSurfaces = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/LawyerDashboardPreDockFeatureSurfaces').then((m) => ({
        default: m.LawyerDashboardPreDockFeatureSurfaces as unknown as LazyComponent,
    })),
);

/** preload-aware: تسخين الجزيرة أثناء تركيب اللوحة حتى لا تُفتح على stub بعد الإقلاع */
export const LazyLawyerDashboardRepositoryFeatureSurfaces = createPreloadableLazyComponent(() =>
    import('@/app/components/lawyer/dashboard/LawyerDashboardRepositoryFeatureSurfaces').then((m) => ({
        default: m.LawyerDashboardRepositoryFeatureSurfaces as unknown as LazyComponent,
    })),
);

export const LazyLawyerDashboardNavigationIsland = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/LawyerDashboardNavigationIsland').then((m) => ({
        default: m.LawyerDashboardNavigationIsland as unknown as LazyComponent,
    })),
);

/** نادر — كسول؛ الشريط CSS فقط بلا motion على MainView */
export const LazyConsolidationNavOverlayEntry = createPreloadableLazyComponent(() =>
    import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardConsolidationNavOverlayEntry'
    ).then((m) => ({
        default: m.LawyerDashboardConsolidationNavOverlayEntry as unknown as LazyComponent,
    })),
);
