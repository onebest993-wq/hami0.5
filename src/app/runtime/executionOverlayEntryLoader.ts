/**
 * مداخل مخزن/إضبارة/إنشاء التنفيذ في MainView — preload-aware بلا برميل lazyEntries.
 */
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import { yieldToMain } from '@/app/runtime/yieldToMain';

export const LazyExecutionOverlayEntry = createPreloadableLazyComponent(() =>
    import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionOverlayEntry'
    ).then((m) => ({
        default: m.LawyerDashboardExecutionOverlayEntry as unknown as LazyComponent,
    })),
);

export const LazyExecutionDossierOverlayEntry = createPreloadableLazyComponent(() =>
    import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionDossierOverlayEntry'
    ).then((m) => ({
        default: m.LawyerDashboardExecutionDossierOverlayEntry as unknown as LazyComponent,
    })),
);

export const LazyExecutionCreateOverlayEntry = createPreloadableLazyComponent(() =>
    import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionCreateOverlayEntry'
    ).then((m) => ({
        default: m.LawyerDashboardExecutionCreateOverlayEntry as unknown as LazyComponent,
    })),
);

export async function prefetchExecutionOverlayEntries(opts?: {
    /** فتح فعلي: المخزن + الإضبارة + الإنشاء معاً. الخمول يبقى متسلسلاً حتى لا يُثقل التحليل */
    parallel?: boolean;
}): Promise<void> {
    if (typeof window === 'undefined') return;
    if (opts?.parallel) {
        await Promise.all([
            LazyExecutionOverlayEntry.preload(),
            LazyExecutionDossierOverlayEntry.preload(),
            LazyExecutionCreateOverlayEntry.preload(),
        ]);
        return;
    }
    await LazyExecutionOverlayEntry.preload();
    await yieldToMain();
    await LazyExecutionDossierOverlayEntry.preload();
    await yieldToMain();
    await LazyExecutionCreateOverlayEntry.preload();
}

export function cleanupExecutionOverlayEntryLoader(): void {
    if (typeof window !== 'undefined') {
        void import('@/app/services/execution/tearDownExecutionFloatingState')
            .then((m) => m.tearDownExecutionFloatingState({
                targetSurface: 'execution-dashboard',
                reason: 'reduced-motion',
            }))
            .catch(() => { /* tearDown never throws */ });
    }
}

export function resetExecutionOverlayEntryLoaderForTests(): void {
    LazyExecutionOverlayEntry.resetForTests();
    LazyExecutionDossierOverlayEntry.resetForTests();
    LazyExecutionCreateOverlayEntry.resetForTests();
}

/*
 * HMR: ما سخّنته هذه الوحدة يُحرَّر عند استبدالها — وإلا بقيت حالةٌ عائمة ومعرّفُ
 * جلسةٍ قديم بعد كل تعديل. وهو الوصل نفسه الذي يفعله `lawsuitWorkspaceWarm`.
 */
if (typeof import.meta !== 'undefined' && import.meta.hot && typeof import.meta.hot.dispose === 'function') {
    import.meta.hot.dispose(() => {
        cleanupExecutionOverlayEntryLoader();
    });
}
