import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

type TransactionsOverlayEntryModule =
    typeof import('@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardTransactionsOverlayEntry');

let overlayEntryPromise: Promise<TransactionsOverlayEntryModule> | null = null;
let overlayEntryResolved = false;

export function isTransactionsHubModuleResolved(): boolean {
    return overlayEntryResolved;
}

function ensureTransactionsOverlayEntry(): Promise<TransactionsOverlayEntryModule> {
    if (!overlayEntryPromise) {
        overlayEntryPromise = import(
            '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardTransactionsOverlayEntry'
        )
            .then((mod) => {
                overlayEntryResolved = Boolean(mod.LawyerDashboardTransactionsOverlayEntry);
                return mod;
            })
            .catch((err) => {
                overlayEntryPromise = null;
                overlayEntryResolved = false;
                throw err;
            });
    }
    return overlayEntryPromise;
}

export const LazyTransactionsOverlayEntry = createPreloadableLazyComponent(() =>
    ensureTransactionsOverlayEntry().then((m) => ({
        default: m.LawyerDashboardTransactionsOverlayEntry as unknown as LazyComponent,
    })),
);

/** للاختبارات */
export function resetTransactionsHubModuleCacheForTests(): void {
    overlayEntryPromise = null;
    overlayEntryResolved = false;
    LazyTransactionsOverlayEntry.resetForTests();
}

/** مقطع Entry (Host + System ثابتان داخله) — مسار واحد بلا تسخين SystemEntry منفصل */
export function prefetchTransactionsHubModule(): void {
    if (typeof window === 'undefined') return;
    void LazyTransactionsOverlayEntry.preload();
}

export function loadTransactionsHubModule(): Promise<TransactionsOverlayEntryModule> {
    void LazyTransactionsOverlayEntry.preload();
    return ensureTransactionsOverlayEntry();
}

export function hydrateTransactionsShellForInstantOpen(): Promise<boolean> {
    return LazyTransactionsOverlayEntry.preload().then(() => isTransactionsHubModuleResolved());
}
