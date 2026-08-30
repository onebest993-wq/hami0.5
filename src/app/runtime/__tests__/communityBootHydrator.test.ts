import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadCommunityScreenModule = vi.fn(() =>
    Promise.resolve({ CommunityScreen: vi.fn() } as typeof import('@/app/components/lawyer/CommunityScreen')),
);
const prefetchCommunityScreenModule = vi.fn();
const hydrateCommunityScreenForInstantOpen = vi.fn(() => Promise.resolve(true));
const warmForumPostsCache = vi.fn();

vi.mock('@/app/runtime/communityHubLoader', () => ({
    isCommunityScreenModuleResolved: vi.fn(() => false),
    loadCommunityScreenModule: (...args: unknown[]) => loadCommunityScreenModule(...args),
    prefetchCommunityScreenModule: (...args: unknown[]) => prefetchCommunityScreenModule(...args),
    hydrateCommunityScreenForInstantOpen: (...args: unknown[]) =>
        hydrateCommunityScreenForInstantOpen(...args),
}));

vi.mock('@/app/services/forum/forumPostsWarmCache', () => ({
    warmForumPostsCache: (...args: unknown[]) => warmForumPostsCache(...args),
}));

vi.mock('@/app/services/auth/lawyerAccountStatus', () => ({
    canUseNetworkFeatures: () => true,
}));

vi.mock('@/app/utils/liveAuthUserId', () => ({
    getLiveAuthUserId: () => 'lawyer-1',
}));

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: vi.fn(() => false),
    isNativeShellStampedOnDom: vi.fn(() => false),
    isMeteredOrSlowNetwork: vi.fn(() => false),
}));

vi.mock('@/app/services/settings/settingsSnapshot', () => ({
    getLawyerSettingsSnapshot: vi.fn(() => ({
        security: { localOnlyMode: false },
        performance: { prefetchScreens: true, litePerformance: false },
    })),
}));

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: vi.fn(() => false),
}));

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: (fn: () => void) => {
        fn();
        return () => undefined;
    },
}));

describe('communityBootHydrator', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        const mod = await import('@/app/runtime/communityBootHydrator');
        mod.resetCommunityBootHydratorForTests();
        vi.mocked(
            (await import('@/app/runtime/communityHubLoader')).isCommunityScreenModuleResolved,
        ).mockReturnValue(false);
    });

    it('hydrateCommunityShellForInstantOpen يحمّل shell ويكاش المنشورات', async () => {
        const { hydrateCommunityShellForInstantOpen, COMMUNITY_SHELL_HYDRATED_EVENT } = await import(
            '@/app/runtime/communityBootHydrator'
        );

        const onHydrated = vi.fn();
        window.addEventListener(COMMUNITY_SHELL_HYDRATED_EVENT, onHydrated);

        const ok = await hydrateCommunityShellForInstantOpen(true);

        expect(ok).toBe(true);
        expect(hydrateCommunityScreenForInstantOpen).toHaveBeenCalledTimes(1);
        expect(warmForumPostsCache).toHaveBeenCalledTimes(1);
        expect(onHydrated).toHaveBeenCalledTimes(1);

        window.removeEventListener(COMMUNITY_SHELL_HYDRATED_EVENT, onHydrated);
    });

    it('hydrateCommunityShellForInstantOpen(false) يتخطى التحميل عند تعطيل prefetch', async () => {
        const { getLawyerSettingsSnapshot } = await import('@/app/services/settings/settingsSnapshot');
        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: true },
            performance: { prefetchScreens: false, litePerformance: false },
        } as ReturnType<typeof getLawyerSettingsSnapshot>);

        const { hydrateCommunityShellForInstantOpen } = await import('@/app/runtime/communityBootHydrator');
        const ok = await hydrateCommunityShellForInstantOpen(false);

        expect(ok).toBe(false);
        expect(hydrateCommunityScreenForInstantOpen).not.toHaveBeenCalled();
    });
});
