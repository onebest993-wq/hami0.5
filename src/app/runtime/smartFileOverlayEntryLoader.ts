/**
 * Chunk بوابة إضبارة الدعوى في MainView (LawyerDashboardSmartFileOverlayEntry).
 * كان sync فيقطع إغلاق MainView (~٣٣ ك.ب)؛ التسخين عبر lawsuitOpenContract + overlay warm.
 * preload-aware: بعد التسخين تُرسم مباشرة بلا إطار Suspense فارغ.
 */
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

type SmartFileOverlayEntryModule =
    typeof import('@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardSmartFileOverlayEntry');

let entryPromise: Promise<SmartFileOverlayEntryModule> | null = null;
let entryResolved = false;

export function isSmartFileOverlayEntryResolved(): boolean {
    return entryResolved;
}

/** للاختبارات */
export function resetSmartFileOverlayEntryCacheForTests(): void {
    entryPromise = null;
    entryResolved = false;
}

function ensureEntryPromise(): Promise<SmartFileOverlayEntryModule> {
    if (!entryPromise) {
        entryPromise = import(
            '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardSmartFileOverlayEntry'
        ).then((mod) => {
            entryResolved = true;
            return mod;
        });
    }
    return entryPromise;
}

export const LazySmartFileOverlayEntry = createPreloadableLazyComponent(() =>
    ensureEntryPromise().then((m) => ({
        default: m.LawyerDashboardSmartFileOverlayEntry as unknown as LazyComponent,
    })),
);

export function prefetchSmartFileOverlayEntry(): void {
    if (typeof window === 'undefined') return;
    void LazySmartFileOverlayEntry.preload();
}

export function loadSmartFileOverlayEntry(): Promise<SmartFileOverlayEntryModule> {
    return ensureEntryPromise();
}
