/**
 * Chunk بوابة مساحة الدعاوى في MainView (LawyerDashboardLawsuitsOverlayEntry).
 * كان sync فيقطع إغلاق MainView (~٩٣ ك.ب)؛ التسخين بعد content-ready + انتظار resolve قبل التركيب.
 * preload-aware: بعد التسخين تُرسم مباشرة بلا إطار Suspense (InstantChrome).
 */
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

type LawsuitsOverlayEntryModule =
    typeof import('@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardLawsuitsOverlayEntry');

let entryPromise: Promise<LawsuitsOverlayEntryModule> | null = null;

function ensureEntryPromise(): Promise<LawsuitsOverlayEntryModule> {
    if (!entryPromise) {
        entryPromise = import(
            '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardLawsuitsOverlayEntry'
        );
    }
    return entryPromise;
}

export const LazyLawsuitsOverlayEntry = createPreloadableLazyComponent(() =>
    ensureEntryPromise().then((m) => ({
        default: m.LawyerDashboardLawsuitsOverlayEntry as unknown as LazyComponent,
    })),
);

export function prefetchLawsuitsOverlayEntry(): void {
    if (typeof window === 'undefined') return;
    void LazyLawsuitsOverlayEntry.preload();
}

export function loadLawsuitsOverlayEntry(): Promise<LawsuitsOverlayEntryModule> {
    return ensureEntryPromise();
}