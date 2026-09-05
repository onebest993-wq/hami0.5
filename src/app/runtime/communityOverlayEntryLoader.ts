/**
 * Chunk بوابة المنتدى في MainView (LawyerDashboardCommunityOverlayEntry).
 * منفصل عن communityHubLoader — بدون هذا الـ prefetch يعلق Suspense على InstantShell عند أول نقرة.
 * preload-aware: بعد التسخين تُرسم مباشرة بلا إطار React.lazy.
 */
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

type CommunityOverlayEntryModule =
    typeof import('@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardCommunityOverlayEntry');

let entryPromise: Promise<CommunityOverlayEntryModule> | null = null;
let entryResolved = false;

export function isCommunityOverlayEntryResolved(): boolean {
    return entryResolved;
}

function ensureEntryPromise(): Promise<CommunityOverlayEntryModule> {
    if (__HAMI_CLIENT_PRODUCT__ === 'hq') {
        return Promise.reject(new Error('community overlay is excluded from the headquarters product'));
    }
    if (!entryPromise) {
        entryPromise = import(
            '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardCommunityOverlayEntry'
        ).then((mod) => {
            entryResolved = true;
            return mod;
        });
    }
    return entryPromise;
}

export const LazyCommunityOverlayEntry = createPreloadableLazyComponent(() =>
    ensureEntryPromise().then((m) => ({
        default: m.LawyerDashboardCommunityOverlayEntry as unknown as LazyComponent,
    })),
);

/** للاختبارات */
export function resetCommunityOverlayEntryCacheForTests(): void {
    entryPromise = null;
    entryResolved = false;
    LazyCommunityOverlayEntry.resetForTests();
}

export function prefetchCommunityOverlayEntry(): void {
    if (typeof window === 'undefined') return;
    void LazyCommunityOverlayEntry.preload();
}

export function loadCommunityOverlayEntry(): Promise<CommunityOverlayEntryModule> {
    void LazyCommunityOverlayEntry.preload();
    return ensureEntryPromise();
}
