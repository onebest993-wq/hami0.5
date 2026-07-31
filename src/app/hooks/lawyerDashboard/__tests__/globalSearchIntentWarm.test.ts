import { beforeEach, describe, expect, it, vi } from 'vitest';

const warmGlobalSearchPipeline = vi.fn();
const warmGlobalSearchExtras = vi.fn();
const prefetchGlobalSearchOverlayChunk = vi.fn();
const prefetchGlobalSearchSearchEngine = vi.fn();
const isLitePerformanceActive = vi.fn(() => false);
const shouldAllowIntentWarmFromDom = vi.fn(() => true);

vi.mock('@/app/services/globalSearchWarm', () => ({
    warmGlobalSearchPipeline: (...args: unknown[]) => warmGlobalSearchPipeline(...args),
}));

vi.mock('@/app/services/globalSearchLoad', () => ({
    warmGlobalSearchExtras: (...args: unknown[]) => warmGlobalSearchExtras(...args),
}));

vi.mock('@/app/runtime/globalSearchLoader', () => ({
    prefetchGlobalSearchOverlayChunk: (...args: unknown[]) => prefetchGlobalSearchOverlayChunk(...args),
    prefetchGlobalSearchSearchEngine: (...args: unknown[]) => prefetchGlobalSearchSearchEngine(...args),
}));

vi.mock('@/app/services/settings/intentWarmGate', () => ({
    shouldAllowIntentWarmFromDom: () => shouldAllowIntentWarmFromDom(),
}));

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: () => isLitePerformanceActive(),
}));

const snapshot = {
    userId: 'guest-lawyer-1',
    files: [],
    executionFiles: [],
    globalNotes: [],
    notifications: [],
    criminalCases: [],
    cacheGeneration: 1,
};

describe('globalSearchIntentWarm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isLitePerformanceActive.mockReturnValue(false);
        shouldAllowIntentWarmFromDom.mockReturnValue(true);
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    });

    it('warmGlobalSearchOnOpen يبدأ فهرس idle في الخلفية بعد paint', async () => {
        const mod = await import('@/app/hooks/lawyerDashboard/globalSearchIntentWarm');
        mod.clearGlobalSearchWarmSnapshot();
        mod.registerGlobalSearchWarmSnapshot(snapshot);
        mod.warmGlobalSearchOnOpen();
        await vi.waitFor(() => {
            expect(prefetchGlobalSearchOverlayChunk).toHaveBeenCalled();
            expect(prefetchGlobalSearchSearchEngine).toHaveBeenCalled();
            expect(warmGlobalSearchExtras).toHaveBeenCalledWith(snapshot.userId);
            expect(warmGlobalSearchPipeline).toHaveBeenCalledWith(snapshot, false);
        });
    });

    it('warmGlobalSearchOnOpen لا يشغّل extras ولا pipeline عند document.hidden', async () => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        const mod = await import('@/app/hooks/lawyerDashboard/globalSearchIntentWarm');
        mod.clearGlobalSearchWarmSnapshot();
        mod.registerGlobalSearchWarmSnapshot(snapshot);
        mod.warmGlobalSearchOnOpen();
        await vi.waitFor(() => {
            expect(prefetchGlobalSearchOverlayChunk).toHaveBeenCalled();
            expect(prefetchGlobalSearchSearchEngine).toHaveBeenCalled();
        });
        expect(warmGlobalSearchExtras).not.toHaveBeenCalled();
        expect(warmGlobalSearchPipeline).not.toHaveBeenCalled();
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    });

    it('warmGlobalSearchOnOpen يعمل بلا snapshot', async () => {
        const mod = await import('@/app/hooks/lawyerDashboard/globalSearchIntentWarm');
        mod.clearGlobalSearchWarmSnapshot();
        mod.warmGlobalSearchOnOpen();
        await vi.waitFor(() => {
            expect(prefetchGlobalSearchOverlayChunk).toHaveBeenCalled();
            expect(prefetchGlobalSearchSearchEngine).toHaveBeenCalled();
        });
        expect(warmGlobalSearchPipeline).not.toHaveBeenCalled();
    });

    it('warmGlobalSearchOnHover prefetches overlay chunk, warms extras, and starts core pipeline', async () => {
        const mod = await import('@/app/hooks/lawyerDashboard/globalSearchIntentWarm');
        mod.clearGlobalSearchWarmSnapshot();
        mod.registerGlobalSearchWarmSnapshot(snapshot);
        mod.warmGlobalSearchOnHover();
        await vi.waitFor(() => {
            expect(prefetchGlobalSearchOverlayChunk).toHaveBeenCalled();
            expect(prefetchGlobalSearchSearchEngine).toHaveBeenCalled();
            expect(warmGlobalSearchExtras).toHaveBeenCalledWith(snapshot.userId);
            expect(warmGlobalSearchPipeline).toHaveBeenCalledWith(snapshot, false);
        });
    });
});
