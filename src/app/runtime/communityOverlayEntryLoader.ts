/**
 * Chunk بوابة المنتدى في MainView (LawyerDashboardCommunityOverlayEntry).
 * منفصل عن communityHubLoader — بدون هذا الـ prefetch يعلق Suspense على InstantShell عند أول نقرة.
 */

type CommunityOverlayEntryModule =
    typeof import('@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardCommunityOverlayEntry');

let entryPromise: Promise<CommunityOverlayEntryModule> | null = null;
let entryResolved = false;

export function isCommunityOverlayEntryResolved(): boolean {
    return entryResolved;
}

/** للاختبارات */
export function resetCommunityOverlayEntryCacheForTests(): void {
    entryPromise = null;
    entryResolved = false;
}

function ensureEntryPromise(): Promise<CommunityOverlayEntryModule> {
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

export function prefetchCommunityOverlayEntry(): void {
    if (typeof window === 'undefined') return;
    void ensureEntryPromise().catch(() => undefined);
}

export function loadCommunityOverlayEntry(): Promise<CommunityOverlayEntryModule> {
    return ensureEntryPromise();
}
