/**
 * Secondary SmartFile hubs — not required for first paint of dossier chrome.
 * Shared preload identity with prefetchSmartFileModalShellWidgets / intent prefetch.
 */
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';

const quickActionsImport = () =>
    import('./parts/QuickActions').then((m) => ({ default: m.QuickActions }));

const timelineFeedImport = () =>
    import('./parts/TimelineFeed').then((m) => ({ default: m.TimelineFeed }));

const sessionAndRequestsHubImport = () =>
    import('./parts/SessionAndRequestsHub').then((m) => ({
        default: m.SessionAndRequestsHub,
    }));

const civilLawReferenceHubImport = () =>
    import('./parts/CivilLawReferenceHub').then((m) => ({
        default: m.CivilLawReferenceHub,
    }));

export const LazyQuickActions = createPreloadableLazyComponent(quickActionsImport);
export const LazyTimelineFeed = createPreloadableLazyComponent(timelineFeedImport);
export const LazySessionAndRequestsHub = createPreloadableLazyComponent(
    sessionAndRequestsHubImport,
);
export const LazyCivilLawReferenceHub = createPreloadableLazyComponent(
    civilLawReferenceHubImport,
);

/** Prefetch on dossier open / FAB intent — same module identity as Suspense. */
export function prefetchSmartFileMainPanelSecondaryHubs(): void {
    if (typeof window === 'undefined') return;
    void LazyQuickActions.preload();
    void LazySessionAndRequestsHub.preload();
    void LazyCivilLawReferenceHub.preload();
    void LazyTimelineFeed.preload();
}
