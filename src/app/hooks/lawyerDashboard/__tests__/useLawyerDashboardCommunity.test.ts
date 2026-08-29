import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLawyerDashboardCommunity } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCommunity';
import { HAMI_DISMISS_OVERLAYS_EVENT } from '@/app/utils/bodyScrollLock';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: vi.fn(),
        info: vi.fn(),
        success: vi.fn(),
    },
}));

vi.mock('@/app/hooks/lawyerDashboard/forumIntentWarm', () => ({
    warmForumOnHover: vi.fn(),
    warmForumOnOpen: vi.fn(),
}));

vi.mock('@/app/runtime/communityBootHydrator', () => ({
    hydrateCommunityShellForInstantOpen: vi.fn(() => Promise.resolve(true)),
    prefetchForumAfterBootReveal: vi.fn(),
    bindCommunityBootHydrator: vi.fn(() => () => undefined),
}));

vi.mock('@/app/runtime/communityHubLoader', () => ({
    loadCommunityScreenModule: vi.fn(() => Promise.resolve({})),
    prefetchCommunityScreenModule: vi.fn(),
}));

vi.mock('@/app/runtime/communityOverlayEntryLoader', () => ({
    prefetchCommunityOverlayEntry: vi.fn(),
    loadCommunityOverlayEntry: () => Promise.resolve({}),
    isCommunityOverlayEntryResolved: () => false,
}));

vi.mock('@/app/services/forum/forumPostsWarmCache', () => ({
    readForumPostsCache: vi.fn(() => Promise.resolve([])),
    warmForumPostsCache: vi.fn(),
}));

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: (fn: () => void) => {
        fn();
        return () => undefined;
    },
}));

vi.mock('@/app/bootstrap/bootReveal', () => ({
    BOOT_REVEAL_DONE_EVENT: 'hami:boot-reveal-done',
    isBootRevealDone: () => false,
}));

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: () => false,
}));

describe('useLawyerDashboardCommunity', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        try {
            sessionStorage.clear();
        } catch {
            /* ignore */
        }
        if (typeof window !== 'undefined' && window.location.hash) {
            window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        }
        document.documentElement.removeAttribute('data-hami-forum-open');
    });

    it('يفتح المنتدى فوراً (flushSync)', async () => {
        const intentMod = await import('@/app/hooks/lawyerDashboard/forumIntentWarm');
        const hubMod = await import('@/app/runtime/communityHubLoader');

        const { result } = renderHook(() =>
            useLawyerDashboardCommunity({ userId: 'lawyer-1', activeTab: 'home' }),
        );

        expect(result.current.showCommunity).toBe(false);
        expect(result.current.communityHostMounted).toBe(false);

        await act(async () => {
            result.current.openCommunityTab();
        });

        await vi.waitFor(() => {
            expect(result.current.showCommunity).toBe(true);
            expect(result.current.communityHostMounted).toBe(true);
        });
        expect(result.current.communitySessionKey).toBe(0);
        expect(intentMod.warmForumOnOpen).toHaveBeenCalled();
        expect(hubMod.loadCommunityScreenModule).toHaveBeenCalled();
    });

    it('primeCommunityShellMount يسخّن بلا فتح ولا تركيب Host', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardCommunity({ userId: 'lawyer-1', activeTab: 'home' }),
        );

        act(() => {
            result.current.primeCommunityShellMount();
        });

        expect(result.current.showCommunity).toBe(false);
        expect(result.current.communityHostMounted).toBe(false);
    });

    it('لا يعيد remount عند إعادة فتح المنتدى', async () => {
        const { result } = renderHook(() =>
            useLawyerDashboardCommunity({ userId: 'lawyer-1', activeTab: 'home' }),
        );

        await act(async () => {
            result.current.openCommunityTab();
        });
        await act(async () => {
            await vi.waitFor(() => {
                expect(result.current.showCommunity).toBe(true);
            });
        });
        const sessionKey = result.current.communitySessionKey;

        act(() => {
            result.current.closeCommunity();
        });
        expect(result.current.showCommunity).toBe(false);
        expect(result.current.communityHostMounted).toBe(false);

        act(() => {
            result.current.openCommunityTab();
        });
        await act(async () => {
            await vi.waitFor(() => {
                expect(result.current.showCommunity).toBe(true);
            });
        });
        expect(result.current.showCommunity).toBe(true);

        expect(result.current.communitySessionKey).toBe(sessionKey);
    });

    it('يفتح سطح المنتدى بدون userId — البوابة داخل الشاشة', async () => {
        const { result } = renderHook(() =>
            useLawyerDashboardCommunity({ userId: null, activeTab: 'home' }),
        );

        await act(async () => {
            result.current.openCommunityTab();
            await Promise.resolve();
        });

        expect(result.current.showCommunity).toBe(true);
    });

    it('يغلق ويمسح deep link عند dismiss-transient-overlays', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardCommunity({ userId: 'lawyer-1', activeTab: 'home' }),
        );

        act(() => {
            result.current.setShowCommunity(true);
            result.current.setCommunityDeepLink({ postId: 'p1', openComments: true });
        });

        act(() => {
            window.dispatchEvent(new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: { except: 'vault' } }));
        });

        expect(result.current.showCommunity).toBe(false);
        expect(result.current.communityDeepLink).toBeNull();
        expect(result.current.communityHostMounted).toBe(false);
    });

    it('لا يمسح ستارة المنتدى إذا كانت نية الفتح معلّقة', async () => {
        const { markForumOpenIntentPending, resetForumOpenIntentForTests } = await import(
            '@/app/runtime/forumOpenIntent'
        );
        const { paintForumInstantChrome } = await import('@/app/runtime/forumInstantPaint');
        markForumOpenIntentPending();
        paintForumInstantChrome();
        expect(document.documentElement.getAttribute('data-hami-forum-open')).toBe('1');

        renderHook(() => useLawyerDashboardCommunity({ userId: 'lawyer-1', activeTab: 'home' }));

        await act(async () => {
            await new Promise<void>((resolve) => {
                window.setTimeout(resolve, 0);
            });
        });

        expect(document.documentElement.getAttribute('data-hami-forum-open')).toBe('1');
        resetForumOpenIntentForTests();
    });

    it('cleanup الحي يعيد تسليح stub ولا يفرّغ __hamiE2eForceOpenCommunity', async () => {
        const stub = vi.fn();
        const w = window as Window & {
            __hamiE2eForceOpenCommunity?: () => void;
            __hamiE2eForceOpenCommunityStub?: () => void;
        };
        w.__hamiE2eForceOpenCommunityStub = stub;
        const { unmount } = renderHook(() =>
            useLawyerDashboardCommunity({ userId: 'lawyer-1', activeTab: 'home' }),
        );
        expect(typeof w.__hamiE2eForceOpenCommunity).toBe('function');
        expect(w.__hamiE2eForceOpenCommunity).not.toBe(stub);
        unmount();
        expect(w.__hamiE2eForceOpenCommunity).toBe(stub);
        delete w.__hamiE2eForceOpenCommunity;
        delete w.__hamiE2eForceOpenCommunityStub;
    });
});
