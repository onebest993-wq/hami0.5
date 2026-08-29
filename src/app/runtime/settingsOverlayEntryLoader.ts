/**
 * Prefetch لمقطع بوابة الإعدادات (تسخين الكاش / مسار الفتح).
 * التركيب الحي كسول من FullBootPath عبر Portal.
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

export function prefetchSettingsOverlayEntry(): void {
    if (typeof window === 'undefined') return;
    void ensureEntryPromise().catch(() => undefined);
}

export function loadSettingsOverlayEntry(): Promise<SettingsOverlayEntryModule> {
    return ensureEntryPromise();
}
