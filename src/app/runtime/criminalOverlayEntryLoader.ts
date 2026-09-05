/**
 * مدخل الإضبارة الجزائية في MainView — preload-aware بلا برميل lazyEntries.
 */
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

export const LazyCriminalOverlayEntry = createPreloadableLazyComponent(() =>
    import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardCriminalOverlayEntry'
    ).then((m) => ({
        default: m.LawyerDashboardCriminalOverlayEntry as unknown as LazyComponent,
    })),
);

export const LazyNewCaseOverlayEntry = createPreloadableLazyComponent(() =>
    import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardNewCaseOverlayEntry'
    ).then((m) => ({
        default: m.LawyerDashboardNewCaseOverlayEntry as unknown as LazyComponent,
    })),
);

export const LazyNonExecArchiveOverlayEntry = createPreloadableLazyComponent(() =>
    import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardNonExecArchiveOverlayEntry'
    ).then((m) => ({
        default: m.LawyerDashboardNonExecArchiveOverlayEntry as unknown as LazyComponent,
    })),
);

export function prefetchCriminalOverlayEntry(): void {
    if (typeof window === 'undefined') return;
    void LazyCriminalOverlayEntry.preload();
}

export function prefetchNewCaseOverlayEntry(): void {
    if (typeof window === 'undefined') return;
    void LazyNewCaseOverlayEntry.preload();
}

export function resetCriminalOverlayEntryLoaderForTests(): void {
    LazyCriminalOverlayEntry.resetForTests();
    LazyNewCaseOverlayEntry.resetForTests();
    LazyNonExecArchiveOverlayEntry.resetForTests();
}
