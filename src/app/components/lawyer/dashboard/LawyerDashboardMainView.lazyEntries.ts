import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import { loadCommunityOverlayEntry } from '@/app/runtime/communityOverlayEntryLoader';
import { loadScheduleTabHostModule } from '@/app/runtime/scheduleHubLoader';
import { loadNotificationShellModule } from '@/app/runtime/notificationShellLoader';
export {
    LazySmartFileOverlayEntry,
    loadSmartFileOverlayEntry,
} from '@/app/runtime/smartFileOverlayEntryLoader';

/**
 * تعريفات Lazy لـ LawyerDashboardMainView — منفصلة لتقسيم الملف دون تغيير سلوك التركيب.
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

export const LazyLawyerDashboardPreDockFeatureSurfaces = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/LawyerDashboardPreDockFeatureSurfaces').then((m) => ({
        default: m.LawyerDashboardPreDockFeatureSurfaces as unknown as LazyComponent,
    })),
);

export const LazyLawyerDashboardNavigationIsland = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/LawyerDashboardNavigationIsland').then((m) => ({
        default: m.LawyerDashboardNavigationIsland as unknown as LazyComponent,
    })),
);

export const LazyProfileTabHost = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/profile/ProfileTabHost').then((m) => ({
        default: m.ProfileTabHost as unknown as LazyComponent,
    })),
);

export const LazyExecutionOverlayEntry = lazyWithRetry(() =>
    import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionOverlayEntry'
    ).then((m) => ({
        default: m.LawyerDashboardExecutionOverlayEntry as unknown as LazyComponent,
    })),
);

export const LazyExecutionDossierOverlayEntry = lazyWithRetry(() =>
    import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionDossierOverlayEntry'
    ).then((m) => ({
        default: m.LawyerDashboardExecutionDossierOverlayEntry as unknown as LazyComponent,
    })),
);

/** مضيف الجدول — كان sync فيقطع مسار الإقلاع (~١٧٦٥ ك.ب) */
export const LazyScheduleTabHost = lazyWithRetry(() =>
    loadScheduleTabHostModule().then((m) => ({
        default: (m as typeof import('@/app/components/lawyer/dashboard/schedule/ScheduleTabHost'))
            .ScheduleTabHost as unknown as LazyComponent,
    })),
);

/**
 * منتدى الزملاء — كسول عبر المحمّل المشترك. الفتح ينتظر resolve قبل التركيب
 * (communityShellOpenFlow) حتى لا يعلق Suspense عند النقر المبكر.
 */
export const LazyCommunityOverlayEntry = lazyWithRetry(() =>
    loadCommunityOverlayEntry().then((m) => ({
        default: m.LawyerDashboardCommunityOverlayEntry as unknown as LazyComponent,
    })),
);

export const LazyNotificationShell = lazyWithRetry(() =>
    loadNotificationShellModule().then((m) => ({
        default: m.NotificationShell as unknown as LazyComponent,
    })),
);

/** مساحة الدعاوى — Entry كان sync (~٩٣ ك.ب) */
export {
    LazyLawsuitsOverlayEntry,
    loadLawsuitsOverlayEntry,
} from '@/app/runtime/lawsuitsOverlayEntryLoader';

/** إضبارة الدعوى SmartFile — preload-aware عبر smartFileOverlayEntryLoader */

export const LazyGlobalSearchOverlayEntry = lazyWithRetry(() =>
    import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardGlobalSearchOverlayEntry'
    ).then((m) => ({
        default: m.LawyerDashboardGlobalSearchOverlayEntry as unknown as LazyComponent,
    })),
);

export const LazyTransactionsOverlayEntry = lazyWithRetry(() =>
    import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardTransactionsOverlayEntry'
    ).then((m) => ({
        default: m.LawyerDashboardTransactionsOverlayEntry as unknown as LazyComponent,
    })),
);

export const LazyRepositoryOverlayEntry = lazyWithRetry(() =>
    import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardRepositoryOverlayEntry'
    ).then((m) => ({
        default: m.LawyerDashboardRepositoryOverlayEntry as unknown as LazyComponent,
    })),
);

export const LazyFieldTasksOverlayEntry = lazyWithRetry(() =>
    import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardFieldTasksOverlayEntry'
    ).then((m) => ({
        default: m.LawyerDashboardFieldTasksOverlayEntry as unknown as LazyComponent,
    })),
);

/** نادر — كسول؛ الشريط CSS فقط بلا motion على MainView */
export const LazyConsolidationNavOverlayEntry = lazyWithRetry(() =>
    import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardConsolidationNavOverlayEntry'
    ).then((m) => ({
        default: m.LawyerDashboardConsolidationNavOverlayEntry as unknown as LazyComponent,
    })),
);

export const LazyNonExecArchiveOverlayEntry = lazyWithRetry(() =>
    import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardNonExecArchiveOverlayEntry'
    ).then((m) => ({
        default: m.LawyerDashboardNonExecArchiveOverlayEntry as unknown as LazyComponent,
    })),
);

export const LazyExecutionCreateOverlayEntry = lazyWithRetry(() =>
    import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionCreateOverlayEntry'
    ).then((m) => ({
        default: m.LawyerDashboardExecutionCreateOverlayEntry as unknown as LazyComponent,
    })),
);

export const LazyNewCaseOverlayEntry = lazyWithRetry(() =>
    import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardNewCaseOverlayEntry'
    ).then((m) => ({
        default: m.LawyerDashboardNewCaseOverlayEntry as unknown as LazyComponent,
    })),
);

export const LazyCriminalOverlayEntry = lazyWithRetry(() =>
    import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardCriminalOverlayEntry'
    ).then((m) => ({
        default: m.LawyerDashboardCriminalOverlayEntry as unknown as LazyComponent,
    })),
);
