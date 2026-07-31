import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
    dismissMock: vi.fn(),
    clearPerfMock: vi.fn(),
    markPerfMock: vi.fn(),
    warmOnOpenMock: vi.fn(),
    prefetchOverlayMock: vi.fn(),
    ensureStylesMock: vi.fn(),
    readPostsCacheMock: vi.fn(() => Promise.resolve([])),
    ensureContentMock: vi.fn(() => Promise.resolve({})),
    loadScreenMock: vi.fn(() => Promise.resolve({})),
}));

vi.mock('react-dom', () => ({
    flushSync: (fn: () => void) => fn(),
}));

vi.mock('@/app/utils/bodyScrollLock', () => ({
    dismissTransientOverlays: mocks.dismissMock,
}));

vi.mock('@/app/services/forum/forumPerfMetrics', () => ({
    clearForumPerfMarks: mocks.clearPerfMock,
    markForumPerfPhase: mocks.markPerfMock,
}));

vi.mock('@/app/runtime/deferredFeatureStyles', () => ({
    ensureDeferredFeatureStylesLoaded: mocks.ensureStylesMock,
}));

vi.mock('@/app/runtime/communityOverlayEntryLoader', () => ({
    prefetchCommunityOverlayEntry: mocks.prefetchOverlayMock,
}));

vi.mock('@/app/hooks/lawyerDashboard/community/communityLazyImports', async (importOriginal) => {
    const actual = await importOriginal<
        typeof import('@/app/hooks/lawyerDashboard/community/communityLazyImports')
    >();
    return {
        ...actual,
        loadForumIntentWarm: vi.fn(() =>
            Promise.resolve({
                warmForumOnOpen: mocks.warmOnOpenMock,
            }),
        ),
        ensureCommunityScreenContentLoaded: mocks.ensureContentMock,
        loadCommunityScreenModule: mocks.loadScreenMock,
        loadForumPostsWarmCache: vi.fn(() =>
            Promise.resolve({
                readForumPostsCache: mocks.readPostsCacheMock,
            }),
        ),
    };
});

describe('communityShellOpenFlow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('commitCommunityOpen يفتح المنتدى ويُسجّل perf', async () => {
        const { commitCommunityOpen } = await import(
            '@/app/hooks/lawyerDashboard/community/communityShellOpenFlow'
        );
        const showCommunityRef = { current: false };
        const setShowCommunity = vi.fn(() => {
            showCommunityRef.current = true;
        });
        const setCommunityHostMounted = vi.fn();

        commitCommunityOpen({
            userId: 'lawyer-1',
            showCommunityRef,
            setCommunityHostMounted,
            setShowCommunity,
        });

        expect(mocks.clearPerfMock).toHaveBeenCalled();
        expect(mocks.markPerfMock).toHaveBeenCalledWith('open-request');
        expect(mocks.markPerfMock).toHaveBeenCalledWith('chunk-ready');
        expect(setCommunityHostMounted).toHaveBeenCalledWith(true);
        expect(setShowCommunity).toHaveBeenCalledWith(true);
        expect(mocks.prefetchOverlayMock).toHaveBeenCalled();

        await new Promise<void>((resolve) => queueMicrotask(resolve));
        expect(mocks.dismissMock).toHaveBeenCalledWith('forum');
        expect(mocks.warmOnOpenMock).toHaveBeenCalledWith('lawyer-1');
        expect(mocks.readPostsCacheMock).toHaveBeenCalled();
    });

    it('commitCommunityOpen يتخطى إذا كان مفتوحاً', async () => {
        const { commitCommunityOpen } = await import(
            '@/app/hooks/lawyerDashboard/community/communityShellOpenFlow'
        );

        commitCommunityOpen({
            userId: 'lawyer-1',
            showCommunityRef: { current: true },
            setCommunityHostMounted: vi.fn(),
            setShowCommunity: vi.fn(),
        });

        expect(mocks.clearPerfMock).not.toHaveBeenCalled();
    });
});
