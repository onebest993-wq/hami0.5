type RepositoryOverlayEntryModule =
    typeof import('@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardRepositoryOverlayEntry');

let overlayEntryPromise: Promise<RepositoryOverlayEntryModule> | null = null;
let overlayEntryResolved = false;

export function isRepositoryHubModuleResolved(): boolean {
    return overlayEntryResolved;
}

/** للاختبارات */
export function resetRepositoryHubModuleCacheForTests(): void {
    overlayEntryPromise = null;
    overlayEntryResolved = false;
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

/** مقطع Entry (Host + Modal ثابتان داخله) */
export function loadRepositoryHubModule(): Promise<RepositoryOverlayEntryModule> {
    return ensureOverlayEntry();
}

export function prefetchRepositoryHubModule(): void {
    if (typeof window === 'undefined') return;
    void loadRepositoryHubModule().catch(() => undefined);
}

export function hydrateRepositoryShellForInstantOpen(): Promise<boolean> {
    return loadRepositoryHubModule()
        .then(() => overlayEntryResolved)
        .catch(() => false);
}
