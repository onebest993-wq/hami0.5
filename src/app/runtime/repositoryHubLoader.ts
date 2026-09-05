import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

type RepositoryOverlayEntryModule =
    typeof import('@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardRepositoryOverlayEntry');

let overlayEntryPromise: Promise<RepositoryOverlayEntryModule> | null = null;
let overlayEntryResolved = false;

export function isRepositoryHubModuleResolved(): boolean {
    return overlayEntryResolved;
}

function ensureOverlayEntry(): Promise<RepositoryOverlayEntryModule> {
    if (!overlayEntryPromise) {
        overlayEntryPromise = import(
            '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardRepositoryOverlayEntry'
        )
            .then((mod) => {
                overlayEntryResolved = Boolean(mod.LawyerDashboardRepositoryOverlayEntry);
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

export const LazyRepositoryOverlayEntry = createPreloadableLazyComponent(() =>
    ensureOverlayEntry().then((m) => ({
        default: m.LawyerDashboardRepositoryOverlayEntry as unknown as LazyComponent,
    })),
);

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        overlayEntryPromise = null;
        overlayEntryResolved = false;
        LazyRepositoryOverlayEntry.resetForTests();
    });
}

/** للاختبارات */
export function resetRepositoryHubModuleCacheForTests(): void {
    overlayEntryPromise = null;
    overlayEntryResolved = false;
    LazyRepositoryOverlayEntry.resetForTests();
}

/** مقطع Entry (Host + Modal ثابتان داخله) */
export function loadRepositoryHubModule(): Promise<RepositoryOverlayEntryModule> {
    void LazyRepositoryOverlayEntry.preload();
    return ensureOverlayEntry();
}

export function prefetchRepositoryHubModule(): void {
    if (typeof window === 'undefined') return;
    void LazyRepositoryOverlayEntry.preload();
}

export function hydrateRepositoryShellForInstantOpen(): Promise<boolean> {
    return LazyRepositoryOverlayEntry.preload().then(() => overlayEntryResolved);
}
