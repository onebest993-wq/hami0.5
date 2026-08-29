/**
 * كاش موحّد لبناء base scope — يُملأ أثناء warm/urgent قبل فتح الإضبارة
 * حتى يكون phoneBodyReady = true من أول commit بلا دورة useEffect.
 */
type BaseScopeBuilder = (input: Record<string, unknown>) => Record<string, unknown>;

type BaseScopeModule = typeof import('./executionDashboardCoreScopeSourcesBaseLazy');

let cachedBuilder: BaseScopeBuilder | null = null;
let loadPromise: Promise<BaseScopeBuilder> | null = null;

export function getCachedExecutionDashboardBaseScopeBuilder(): BaseScopeBuilder | null {
    return cachedBuilder;
}

export function loadAndCacheExecutionDashboardBaseScopeBuilder(): Promise<BaseScopeBuilder> {
    if (cachedBuilder) {
        return Promise.resolve(cachedBuilder);
    }
    if (!loadPromise) {
        loadPromise = import('./executionDashboardCoreScopeSourcesBaseLazy')
            .then((m: BaseScopeModule) => {
                cachedBuilder = m.buildExecutionDashboardCoreDeferredBaseChunkScopeSources as BaseScopeBuilder;
                return cachedBuilder;
            })
            .catch((error: unknown) => {
                loadPromise = null;
                throw error;
            });
    }
    return loadPromise;
}

export function resetExecutionDashboardBaseScopeCacheForTests(): void {
    cachedBuilder = null;
    loadPromise = null;
}
