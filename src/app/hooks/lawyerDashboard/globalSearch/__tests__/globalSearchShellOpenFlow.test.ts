import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
    dismissMock: vi.fn(),
    persistMock: vi.fn(),
    revealMock: vi.fn(() => false),
    snapOpenMock: vi.fn(),
    takeDraftMock: vi.fn(() => 'مسودة'),
    warmOnOpenMock: vi.fn(),
    hydrateMock: vi.fn(() => Promise.resolve(true)),
    loadOverlayMock: vi.fn(() => Promise.resolve({})),
    prefetchEngineMock: vi.fn(),
    clearPerfMock: vi.fn(),
    markPerfMock: vi.fn(),
    isResolvedMock: vi.fn(() => false),
    flushOrder: [] as string[],
}));

vi.mock('react-dom', () => ({
    flushSync: (fn: () => void) => {
        mocks.flushOrder.push('flush');
        fn();
    },
}));

vi.mock('@/app/utils/bodyScrollLock', () => ({
    dismissTransientOverlays: mocks.dismissMock,
}));

vi.mock('@/app/hooks/lawyerDashboard/lawyerDashboardNav', () => ({
    persistGlobalSearchSessionOpen: mocks.persistMock,
}));

vi.mock('@/app/runtime/globalSearchInstantPaint', () => ({
    revealGlobalSearchWarmShell: mocks.revealMock,
}));

vi.mock('@/app/runtime/globalSearchDraftQuery', () => ({
    takeGlobalSearchDraftQuery: mocks.takeDraftMock,
}));

vi.mock('@/app/runtime/globalSearchLoader', () => ({
    isGlobalSearchOverlayModuleResolved: mocks.isResolvedMock,
    loadGlobalSearchOverlayModule: mocks.loadOverlayMock,
    prefetchGlobalSearchSearchEngine: mocks.prefetchEngineMock,
}));

vi.mock('@/app/runtime/globalSearchBootHydrator', () => ({
    hydrateGlobalSearchShellForInstantOpen: mocks.hydrateMock,
}));

vi.mock('@/app/hooks/lawyerDashboard/globalSearchIntentWarm', () => ({
    warmGlobalSearchOnOpen: mocks.warmOnOpenMock,
}));

vi.mock('@/app/services/search/globalSearchShellSnap', () => ({
    snapGlobalSearchShellOpen: () => {
        mocks.snapOpenMock();
        mocks.flushOrder.push('snap');
    },
}));

vi.mock('@/app/services/search/globalSearchPerfMetrics', () => ({
    clearGlobalSearchPerfMarks: mocks.clearPerfMock,
    markGlobalSearchPerfPhase: mocks.markPerfMock,
}));

describe('globalSearchShellOpenFlow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.flushOrder.length = 0;
    });

    it('commitGlobalSearchShellOpen يفتح ويُسجّل الجلسة', async () => {
        const { commitGlobalSearchShellOpen } = await import(
            '@/app/hooks/lawyerDashboard/globalSearch/globalSearchShellOpenFlow'
        );
        const showGlobalSearchRef = { current: true };
        const setSearchHostMounted = vi.fn();
        const setGlobalSearchInitialQuery = vi.fn();
        const setShowGlobalSearch = vi.fn();

        commitGlobalSearchShellOpen({
            querySeed: '  استعلام  ',
            showGlobalSearchRef,
            setSearchHostMounted,
            setGlobalSearchInitialQuery,
            setShowGlobalSearch,
        });

        expect(mocks.clearPerfMock).toHaveBeenCalled();
        expect(mocks.markPerfMock).toHaveBeenCalledWith('open-request');
        expect(setSearchHostMounted).toHaveBeenCalledWith(true);
        expect(setGlobalSearchInitialQuery).toHaveBeenCalledWith('استعلام');
        expect(setShowGlobalSearch).toHaveBeenCalledWith(true);
        expect(mocks.persistMock).toHaveBeenCalledWith(true);
        expect(mocks.revealMock).toHaveBeenCalled();
        expect(mocks.snapOpenMock).toHaveBeenCalled();
        expect(mocks.flushOrder).toEqual(['snap', 'flush']);
        expect(mocks.takeDraftMock).not.toHaveBeenCalled();

        await new Promise<void>((resolve) => queueMicrotask(resolve));
        expect(mocks.warmOnOpenMock).toHaveBeenCalled();
        expect(mocks.dismissMock).toHaveBeenCalledWith('global-search');
        expect(mocks.prefetchEngineMock).toHaveBeenCalled();
    });

    it('يأخذ المسودة عند غياب seed', async () => {
        const { commitGlobalSearchShellOpen } = await import(
            '@/app/hooks/lawyerDashboard/globalSearch/globalSearchShellOpenFlow'
        );

        commitGlobalSearchShellOpen({
            showGlobalSearchRef: { current: true },
            setSearchHostMounted: vi.fn(),
            setGlobalSearchInitialQuery: vi.fn(),
            setShowGlobalSearch: vi.fn(),
        });

        expect(mocks.takeDraftMock).toHaveBeenCalled();
    });
});
