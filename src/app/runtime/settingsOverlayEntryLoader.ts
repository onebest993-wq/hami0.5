/**
 * Prefetch لمقطع بوابة الإعدادات (تسخين الكاش / مسار الفتح).
 * التركيب الحي كسول من FullBootPath عبر Portal.
 * preload-aware: بعد التسخين تُرسم مباشرة بلا إطار React.lazy.
 */
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

type SettingsOverlayEntryModule =
    typeof import('@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardSettingsOverlayEntry');

let entryPromise: Promise<SettingsOverlayEntryModule> | null = null;
let entryResolved = false;

export function isSettingsOverlayEntryResolved(): boolean {
    return entryResolved;
}

function ensureEntryPromise(): Promise<SettingsOverlayEntryModule> {
    if (!entryPromise) {
        entryPromise = import(
            '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardSettingsOverlayEntry'
        )
            .then((mod) => {
                entryResolved = true;
                return mod;
            })
            .catch((err: unknown) => {
                entryPromise = null;
                entryResolved = false;
                throw err;
            });
    }
    return entryPromise;
}

export const LazySettingsOverlayEntry = createPreloadableLazyComponent(() =>
    ensureEntryPromise().then((m) => ({
        default: m.LawyerDashboardSettingsOverlayEntry as unknown as LazyComponent,
    })),
);

/** للاختبارات */
export function resetSettingsOverlayEntryCacheForTests(): void {
    entryPromise = null;
    entryResolved = false;
    LazySettingsOverlayEntry.resetForTests();
}

export function prefetchSettingsOverlayEntry(): void {
    if (typeof window === 'undefined') return;
    void LazySettingsOverlayEntry.preload();
}

export function loadSettingsOverlayEntry(): Promise<SettingsOverlayEntryModule> {
    void LazySettingsOverlayEntry.preload();
    return ensureEntryPromise();
}
