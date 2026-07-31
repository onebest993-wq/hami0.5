import { describe, expect, it, beforeEach, vi } from 'vitest';

vi.mock('../executionDashboardCoreScopeSourcesBaseLazy', () => ({
    buildExecutionDashboardCoreDeferredBaseChunkScopeSources: vi.fn(() => ({ ready: true })),
}));

describe('executionDashboardBaseScopeCache', () => {
    beforeEach(async () => {
        vi.resetModules();
        const cache = await import('../executionDashboardBaseScopeCache');
        cache.resetExecutionDashboardBaseScopeCacheForTests();
    });

    it('يعيد null قبل التحميل ثم يثبّت البناء بعد load', async () => {
        const cache = await import('../executionDashboardBaseScopeCache');
        expect(cache.getCachedExecutionDashboardBaseScopeBuilder()).toBeNull();
        const builder = await cache.loadAndCacheExecutionDashboardBaseScopeBuilder();
        expect(builder).toBeTypeOf('function');
        expect(cache.getCachedExecutionDashboardBaseScopeBuilder()).toBe(builder);
        expect(builder({})).toEqual({ ready: true });
    });
});
