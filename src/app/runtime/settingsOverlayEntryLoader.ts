/**
 * Chunk بوابة الإعدادات في MainView (LawyerDashboardSettingsOverlayEntry).
 * منفصل عن hamiSettingsLoader — بدون هذا الـ prefetch يعلق Suspense على fallback.
 */

type SettingsOverlayEntryModule =
    typeof import('@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardSettingsOverlayEntry');

let entryPromise: Promise<SettingsOverlayEntryModule> | null = null;
let entryResolved = false;

export function isSettingsOverlayEntryResolved(): boolean {
    return entryResolved;
}

/** للاختبارات */
export function resetSettingsOverlayEntryCacheForTests(): void {
    entryPromise = null;
    entryResolved = false;
}

function ensureEntryPromise(): Promise<SettingsOverlayEntryModule> {
    if (!entryPromise) {
        entryPromise = import(
            '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardSettingsOverlayEntry'
        ).then((mod) => {
            entryResolved = true;
            return mod;
        });
    }
    return entryPromise;
}

export function prefetchSettingsOverlayEntry(): void {
    if (typeof window === 'undefined') return;
    void ensureEntryPromise().catch(() => undefined);
}

export function loadSettingsOverlayEntry(): Promise<SettingsOverlayEntryModule> {
    return ensureEntryPromise();
}
