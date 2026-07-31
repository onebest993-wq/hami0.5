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
    });

    it('يفتح المنتدى فوراً (flushSync)', async () => {
        const intentMod = await import('@/app/hooks/lawyerDashboard/forumIntentWarm');
        const hubMod = await import('@/app/runtime/communityHubLoader');

        const { result } = renderHook(() =>
            useLawyerDashboardCommunity({ userId: 'lawyer-1', activeTab: 'home' }),
        );

        expect(result.current.showCommunity).toBe(false);

        await act(async () => {
            result.current.openCommunityTab();
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(result.current.showCommunity).toBe(true);
        expect(result.current.communityHostMounted).toBe(true);
        expect(result.current.communitySessionKey).toBe(0);
        expect(intentMod.warmForumOnOpen).toHaveBeenCalled();
        expect(hubMod.loadCommunityScreenModule).toHaveBeenCalled();
    });

    it('لا يعيد remount عند إعادة فتح المنتدى', async () => {
        const { result } = renderHook(() =>
            useLawyerDashboardCommunity({ userId: 'lawyer-1', activeTab: 'home' }),
        );

        act(() => {
            result.current.openCommunityTab();
        });
        expect(result.current.showCommunity).toBe(true);
        const sessionKey = result.current.communitySessionKey;

        act(() => {
            result.current.closeCommunity();
        });

        act(() => {
            result.current.openCommunityTab();
        });
        expect(result.current.showCommunity).toBe(true);

        expect(result.current.communitySessionKey).toBe(sessionKey);
    });

    it('يرفض الفتح بدون تسجيل دخول', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardCommunity({ userId: null, activeTab: 'home' }),
        );

        act(() => {
            result.current.openCommunityTab();
        });

        expect(result.current.showCommunity).toBe(false);
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
    });
});
