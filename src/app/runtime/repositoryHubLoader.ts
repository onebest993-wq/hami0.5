import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import SecureStoreService from '@/app/services/SecureStoreService';

type RepositoryOverlayEntryModule =
    typeof import('@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardRepositoryOverlayEntry');

let overlayEntryPromise: Promise<RepositoryOverlayEntryModule> | null = null;
let overlayEntryResolved = false;

let hubLoaderOpenSessionCounter = 0;
let lastActiveHubLoaderId = 0;
const hubLoaderSessionIdRef: { current: number } = { current: 0 };
const hubLoaderActiveSessionIdRef: { current: number } = { current: 0 };

function markHubLoaderSessionBoot(): void {
    hubLoaderOpenSessionCounter += 1;
    lastActiveHubLoaderId = hubLoaderOpenSessionCounter;
    hubLoaderSessionIdRef.current = hubLoaderOpenSessionCounter;
    hubLoaderActiveSessionIdRef.current = hubLoaderOpenSessionCounter;
}

export function isRepositoryHubModuleResolved(): boolean {
    return overlayEntryResolved;
}

function ensureOverlayEntry(): Promise<RepositoryOverlayEntryModule> {
    markHubLoaderSessionBoot();
    if (!overlayEntryPromise) {
        overlayEntryPromise = import(
            '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardRepositoryOverlayEntry'
        )
            .then((mod) => {
                if (hubLoaderSessionIdRef.current !== hubLoaderActiveSessionIdRef.current) return mod;
                overlayEntryResolved = Boolean(mod.LawyerDashboardRepositoryOverlayEntry);
                return mod;
            })
            .catch((err) => {
                if (hubLoaderSessionIdRef.current !== hubLoaderActiveSessionIdRef.current) throw err;
                overlayEntryPromise = null;
                overlayEntryResolved = false;
                throw err;
            });
    }
    return overlayEntryPromise;
}

export const LazyRepositoryOverlayEntry = createPreloadableLazyComponent(() =>
    ensureOverlayEntry().then((m) => {
        if (hubLoaderSessionIdRef.current !== hubLoaderActiveSessionIdRef.current) return { default: m.LawyerDashboardRepositoryOverlayEntry as unknown as LazyComponent };
        return {
            default: m.LawyerDashboardRepositoryOverlayEntry as unknown as LazyComponent,
        };
    }),
);

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        hubLoaderActiveSessionIdRef.current = 0;
        overlayEntryPromise = null;
        overlayEntryResolved = false;
        LazyRepositoryOverlayEntry.resetForTests();
        try {
            void import('@/app/services/repository/tearDownRepoFloatingState').then(({ tearDownRepoFloatingState }) => {
                tearDownRepoFloatingState({ targetSurface: 'repository-hub', reason: 'tearDown' });
            });
        } catch {
            /* never throw HMR dispose */
        }
    });
}

/** للاختبارات */
export function resetRepositoryHubModuleCacheForTests(): void {
    hubLoaderActiveSessionIdRef.current = 0;
    overlayEntryPromise = null;
    overlayEntryResolved = false;
    LazyRepositoryOverlayEntry.resetForTests();
    try {
        void import('@/app/services/repository/tearDownRepoFloatingState').then(({ tearDownRepoFloatingState }) => {
            tearDownRepoFloatingState({ targetSurface: 'repository-hub', reason: 'tearDown' });
        });
    } catch {
        /* never throw test reset */
    }
}

/** مقطع Entry (Host + Modal ثابتان داخله) */
export function loadRepositoryHubModule(): Promise<RepositoryOverlayEntryModule> {
    if (typeof SecureStoreService?.ensurePersistedReady === 'function') { try { SecureStoreService.ensurePersistedReady(); } catch {} }
    markHubLoaderSessionBoot();
    void LazyRepositoryOverlayEntry.preload();
    return ensureOverlayEntry();
}

export function prefetchRepositoryHubModule(): void {
    if (typeof window === 'undefined') return;
    void LazyRepositoryOverlayEntry.preload();
}

export function hydrateRepositoryShellForInstantOpen(): Promise<boolean> {
    markHubLoaderSessionBoot();
    return LazyRepositoryOverlayEntry.preload().then(() => {
        if (hubLoaderSessionIdRef.current !== hubLoaderActiveSessionIdRef.current) return false;
        return overlayEntryResolved;
    });
}
