import { beforeEach, describe, expect, it, vi } from 'vitest';

const hydrateProfileShellForInstantOpen = vi.fn(() => Promise.resolve(true));
const prefetchProfileHubModule = vi.fn();
const warmProfileDataCache = vi.fn(() => Promise.resolve());
const hydrateProfileWarmCachePeekSync = vi.fn();

vi.mock('@/app/runtime/royalLawyerProfileLoader', () => ({
    hydrateProfileShellForInstantOpen: (...args: unknown[]) => hydrateProfileShellForInstantOpen(...args),
    isProfileShellModuleResolved: vi.fn(() => false),
    prefetchProfileHubModule: (...args: unknown[]) => prefetchProfileHubModule(...args),
    loadProfileHubModule: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@/app/services/profile/profileWarmCache', () => ({
    warmProfileDataCache: (...args: unknown[]) => warmProfileDataCache(...args),
    hydrateProfileWarmCachePeekSync: (...args: unknown[]) => hydrateProfileWarmCachePeekSync(...args),
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

describe('profileBootHydrator', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        const { getLawyerSettingsSnapshot } = await import('@/app/services/settings/settingsSnapshot');
        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: false },
            performance: { prefetchScreens: true, litePerformance: false },
        } as never);
        const { isLitePerformanceActive } = await import('@/app/runtime/devicePerformanceTier');
        vi.mocked(isLitePerformanceActive).mockReturnValue(false);
        const mod = await import('@/app/runtime/profileBootHydrator');
        mod.resetProfileBootHydratorForTests();
        vi.mocked(
            (await import('@/app/runtime/royalLawyerProfileLoader')).isProfileShellModuleResolved,
        ).mockReturnValue(false);
    });

    it('hydrateProfileShellForInstantOpenWithData يحمّل shell + كاش البيانات', async () => {
        const { hydrateProfileShellForInstantOpenWithData, PROFILE_SHELL_HYDRATED_EVENT } =
            await import('@/app/runtime/profileBootHydrator');

        const onHydrated = vi.fn();
        window.addEventListener(PROFILE_SHELL_HYDRATED_EVENT, onHydrated);

        const ok = await hydrateProfileShellForInstantOpenWithData('lawyer-1', true);

        await vi.waitFor(() => {
            expect(hydrateProfileWarmCachePeekSync).toHaveBeenCalledWith('lawyer-1');
            expect(warmProfileDataCache).toHaveBeenCalledWith('lawyer-1');
        });

        expect(ok).toBe(true);
        expect(hydrateProfileShellForInstantOpen).toHaveBeenCalledTimes(1);
        expect(onHydrated).toHaveBeenCalledTimes(1);

        window.removeEventListener(PROFILE_SHELL_HYDRATED_EVENT, onHydrated);
    });

    it('hydrateProfileShellForInstantOpenWithData(false) يتخطى التحميل عند تعطيل prefetch', async () => {
        const { getLawyerSettingsSnapshot } = await import('@/app/services/settings/settingsSnapshot');
        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: true },
            performance: { prefetchScreens: false, litePerformance: false },
        } as never);

        const { hydrateProfileShellForInstantOpenWithData } = await import(
            '@/app/runtime/profileBootHydrator'
        );

        const blocked = await hydrateProfileShellForInstantOpenWithData('lawyer-1', false);
        expect(blocked).toBe(false);
        expect(hydrateProfileShellForInstantOpen).not.toHaveBeenCalled();

        hydrateProfileShellForInstantOpen.mockClear();
        const forced = await hydrateProfileShellForInstantOpenWithData('lawyer-1', true);
        expect(forced).toBe(true);
        expect(hydrateProfileShellForInstantOpen).toHaveBeenCalledTimes(1);
    });

    it('prefetchProfileHubAfterInteractive يتخطى على lite', async () => {
        const { isLitePerformanceActive } = await import('@/app/runtime/devicePerformanceTier');
        vi.mocked(isLitePerformanceActive).mockReturnValue(true);
        const { prefetchProfileHubAfterInteractive } = await import(
            '@/app/runtime/profileBootHydrator'
        );
        prefetchProfileHubAfterInteractive();
        await new Promise((r) => setTimeout(r, 20));
        expect(prefetchProfileHubModule).not.toHaveBeenCalled();
        expect(hydrateProfileShellForInstantOpen).not.toHaveBeenCalled();
    });

    it('prefetchProfileAfterBootReveal يسخّن بيانات بلا مقطع hub', async () => {
        const { prefetchProfileAfterBootReveal } = await import('@/app/runtime/profileBootHydrator');

        prefetchProfileAfterBootReveal('lawyer-boot');

        await vi.waitFor(() => {
            expect(hydrateProfileWarmCachePeekSync).toHaveBeenCalledWith('lawyer-boot');
            expect(warmProfileDataCache).toHaveBeenCalledWith('lawyer-boot');
        });
        expect(hydrateProfileShellForInstantOpen).not.toHaveBeenCalled();
        expect(prefetchProfileHubModule).not.toHaveBeenCalled();
    });
});
