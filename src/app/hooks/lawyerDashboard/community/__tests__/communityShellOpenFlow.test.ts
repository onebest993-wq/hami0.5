import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent } from '@testing-library/react';
import {
    consumeNativeBackForTests,
    resetNativeBackHandlersForTests,
} from '@/app/runtime/nativeBackStack';

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
    loadOverlayEntryMock: vi.fn(() => Promise.resolve({})),
    isOverlayResolvedMock: vi.fn(() => false),
}));

vi.mock('react-dom', () => ({
    flushSync: (fn: () => void) => fn(),
}));

vi.mock('@/app/utils/bodyScrollLock', () => ({
    dismissTransientOverlays: mocks.dismissMock,
    reconcileBodyScrollLock: vi.fn(),
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
    loadCommunityOverlayEntry: () => mocks.loadOverlayEntryMock(),
    isCommunityOverlayEntryResolved: () => mocks.isOverlayResolvedMock(),
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
    beforeEach(async () => {
        vi.clearAllMocks();
        mocks.loadOverlayEntryMock.mockImplementation(() => Promise.resolve({}));
        mocks.isOverlayResolvedMock.mockReturnValue(false);
        document.documentElement.removeAttribute('data-hami-forum-open');
        resetNativeBackHandlersForTests();
        const { resetCommunityOpenFlowForTests } = await import(
            '@/app/hooks/lawyerDashboard/community/communityShellOpenFlow'
        );
        resetCommunityOpenFlowForTests();
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

        expect(document.documentElement.getAttribute('data-hami-forum-open')).toBe('1');
        expect(mocks.clearPerfMock).toHaveBeenCalled();
        expect(mocks.markPerfMock).toHaveBeenCalledWith('open-request');
        expect(mocks.prefetchOverlayMock).toHaveBeenCalled();

        await vi.waitFor(() => {
            expect(mocks.markPerfMock).toHaveBeenCalledWith('chunk-ready');
            expect(setCommunityHostMounted).toHaveBeenCalledWith(true);
            expect(setShowCommunity).toHaveBeenCalledWith(true);
        });

        await new Promise<void>((resolve) => queueMicrotask(resolve));
        expect(mocks.dismissMock).toHaveBeenCalledWith('forum');
        expect(mocks.warmOnOpenMock).toHaveBeenCalledWith('lawyer-1');
        expect(mocks.readPostsCacheMock).toHaveBeenCalled();
    });

    it('commitCommunityOpen يكشف فوراً إذا كان Host مركّباً', async () => {
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
            hostAlreadyMounted: true,
        });

        expect(setShowCommunity).toHaveBeenCalledWith(true);
        expect(setCommunityHostMounted).toHaveBeenCalledWith(true);
        expect(mocks.markPerfMock).toHaveBeenCalledWith('chunk-ready');
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
            hostAlreadyMounted: true,
        });

        expect(mocks.clearPerfMock).not.toHaveBeenCalled();
        expect(document.documentElement.hasAttribute('data-hami-forum-open')).toBe(false);
    });

    it('يكمل تركيب Host إذا كانت الحالة مفتوحة أثناء انتظار المقطع', async () => {
        let resolveLoad: (value: unknown) => void = () => undefined;
        mocks.loadOverlayEntryMock.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveLoad = resolve;
                }),
        );
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

        showCommunityRef.current = true;

        resolveLoad({});
        await vi.waitFor(() => {
            expect(setCommunityHostMounted).toHaveBeenCalledWith(true);
            expect(setShowCommunity).toHaveBeenCalledWith(true);
        });
        expect(document.documentElement.getAttribute('data-hami-forum-open')).toBe('1');
    });

    it('commitCommunityClose يخفي الستارة', async () => {
        const { commitCommunityOpen, commitCommunityClose } = await import(
            '@/app/hooks/lawyerDashboard/community/communityShellOpenFlow'
        );
        const showCommunityRef = { current: false };
        commitCommunityOpen({
            userId: 'lawyer-1',
            showCommunityRef,
            setCommunityHostMounted: vi.fn(),
            setShowCommunity: vi.fn(() => {
                showCommunityRef.current = true;
            }),
        });
        await vi.waitFor(() => {
            expect(showCommunityRef.current).toBe(true);
        });

        const setShowCommunity = vi.fn();
        const setCommunityDeepLink = vi.fn();
        commitCommunityClose({
            setShowCommunity,
            setCommunityDeepLink,
            setCommunityHostMounted: vi.fn(),
        });
        expect(document.documentElement.hasAttribute('data-hami-forum-open')).toBe(false);
        expect(setShowCommunity).toHaveBeenCalledWith(false);
        expect(setCommunityDeepLink).toHaveBeenCalledWith(null);
    });

    it('يكشف بعد مهلة إن علق تحميل مقطع الطبقة', async () => {
        vi.useFakeTimers();
        mocks.loadOverlayEntryMock.mockImplementation(() => new Promise(() => undefined));
        const { commitCommunityOpen } = await import(
            '@/app/hooks/lawyerDashboard/community/communityShellOpenFlow'
        );
        const setShowCommunity = vi.fn();
        const showCommunityRef = { current: false };

        commitCommunityOpen({
            userId: 'lawyer-1',
            showCommunityRef,
            setCommunityHostMounted: vi.fn(),
            setShowCommunity,
        });

        expect(setShowCommunity).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(3_000);
        expect(setShowCommunity).toHaveBeenCalledWith(true);
        vi.useRealTimers();
    });

    it('Escape أثناء انتظار المقطع يلغي الفتح ولا يكشف بعد وصوله', async () => {
        let resolveLoad: (value: unknown) => void = () => undefined;
        mocks.loadOverlayEntryMock.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveLoad = resolve;
                }),
        );
        const { commitCommunityOpen } = await import(
            '@/app/hooks/lawyerDashboard/community/communityShellOpenFlow'
        );
        const setShowCommunity = vi.fn();
        const showCommunityRef = { current: false };

        commitCommunityOpen({
            userId: 'lawyer-1',
            showCommunityRef,
            setCommunityHostMounted: vi.fn(),
            setShowCommunity,
        });

        expect(setShowCommunity).not.toHaveBeenCalled();
        expect(document.documentElement.getAttribute('data-hami-forum-open')).toBe('1');

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(document.documentElement.hasAttribute('data-hami-forum-open')).toBe(false);
        expect(setShowCommunity).not.toHaveBeenCalled();

        resolveLoad({});
        await Promise.resolve();
        await Promise.resolve();
        expect(setShowCommunity).not.toHaveBeenCalled();
        expect(showCommunityRef.current).toBe(false);
    });

    it('Cap أثناء انتظار المقطع يلغي الفتح', async () => {
        mocks.loadOverlayEntryMock.mockImplementation(() => new Promise(() => undefined));
        const { commitCommunityOpen } = await import(
            '@/app/hooks/lawyerDashboard/community/communityShellOpenFlow'
        );
        const setShowCommunity = vi.fn();

        commitCommunityOpen({
            userId: 'lawyer-1',
            showCommunityRef: { current: false },
            setCommunityHostMounted: vi.fn(),
            setShowCommunity,
        });

        expect(consumeNativeBackForTests()).toBe(true);
        expect(document.documentElement.hasAttribute('data-hami-forum-open')).toBe(false);
        expect(setShowCommunity).not.toHaveBeenCalled();
    });

    it('فشل مقطع الطبقة يكشف Host بدل طرد المستخدم', async () => {
        mocks.loadOverlayEntryMock.mockRejectedValueOnce(new Error('chunk fail'));
        const { commitCommunityOpen } = await import(
            '@/app/hooks/lawyerDashboard/community/communityShellOpenFlow'
        );
        const setShowCommunity = vi.fn();
        const setCommunityHostMounted = vi.fn();

        commitCommunityOpen({
            userId: 'lawyer-1',
            showCommunityRef: { current: false },
            setCommunityHostMounted,
            setShowCommunity,
        });

        await vi.waitFor(() => {
            expect(setShowCommunity).toHaveBeenCalledWith(true);
            expect(setCommunityHostMounted).toHaveBeenCalledWith(true);
        });
        expect(document.documentElement.getAttribute('data-hami-forum-open')).toBe('1');
    });
});
