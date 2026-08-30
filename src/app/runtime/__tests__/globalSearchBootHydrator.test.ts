import { beforeEach, describe, expect, it, vi } from 'vitest';

const hydrateGlobalSearchOverlayForInstantOpen = vi.fn(() => Promise.resolve(true));
const isGlobalSearchOverlayModuleResolved = vi.fn(() => false);
const prefetchGlobalSearchInstantPaintCover = vi.fn();
const prefetchGlobalSearchOverlayChunk = vi.fn();
const prefetchGlobalSearchSearchEngine = vi.fn();

vi.mock('@/app/runtime/globalSearchLoader', () => ({
    hydrateGlobalSearchOverlayForInstantOpen: (...args: unknown[]) =>
        hydrateGlobalSearchOverlayForInstantOpen(...args),
    isGlobalSearchOverlayModuleResolved: (...args: unknown[]) =>
        isGlobalSearchOverlayModuleResolved(...args),
    prefetchGlobalSearchInstantPaintCover: (...args: unknown[]) =>
        prefetchGlobalSearchInstantPaintCover(...args),
    prefetchGlobalSearchOverlayChunk: (...args: unknown[]) =>
        prefetchGlobalSearchOverlayChunk(...args),
    prefetchGlobalSearchSearchEngine: (...args: unknown[]) =>
        prefetchGlobalSearchSearchEngine(...args),
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

describe('globalSearchBootHydrator', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        const { getLawyerSettingsSnapshot } = await import('@/app/services/settings/settingsSnapshot');
        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: false },
            performance: { prefetchScreens: true, litePerformance: false },
        } as ReturnType<typeof getLawyerSettingsSnapshot>);
        const mod = await import('@/app/runtime/globalSearchBootHydrator');
        mod.resetGlobalSearchBootHydratorForTests();
        isGlobalSearchOverlayModuleResolved.mockReturnValue(false);
    });

    it('hydrateGlobalSearchShellForInstantOpen يحمّل chunk ويُطلق hydrated', async () => {
        const { hydrateGlobalSearchShellForInstantOpen, GLOBAL_SEARCH_SHELL_HYDRATED_EVENT } =
            await import('@/app/runtime/globalSearchBootHydrator');

        const onHydrated = vi.fn();
        window.addEventListener(GLOBAL_SEARCH_SHELL_HYDRATED_EVENT, onHydrated);

        const ok = await hydrateGlobalSearchShellForInstantOpen(true);

        expect(ok).toBe(true);
        expect(hydrateGlobalSearchOverlayForInstantOpen).toHaveBeenCalledTimes(1);
        expect(prefetchGlobalSearchSearchEngine).not.toHaveBeenCalled();
        expect(onHydrated).toHaveBeenCalledTimes(1);

        window.removeEventListener(GLOBAL_SEARCH_SHELL_HYDRATED_EVENT, onHydrated);
    });

    it('hydrateGlobalSearchShellForInstantOpen(false) يتخطى التحميل عند تعطيل prefetch', async () => {
        const { getLawyerSettingsSnapshot } = await import('@/app/services/settings/settingsSnapshot');
        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: true },
            performance: { prefetchScreens: false, litePerformance: false },
        } as ReturnType<typeof getLawyerSettingsSnapshot>);

        const { hydrateGlobalSearchShellForInstantOpen } = await import(
            '@/app/runtime/globalSearchBootHydrator'
        );

        const ok = await hydrateGlobalSearchShellForInstantOpen(false);

        expect(ok).toBe(false);
        expect(hydrateGlobalSearchOverlayForInstantOpen).not.toHaveBeenCalled();
    });

    it('bindGlobalSearchBootHydrator لا يحمّل eagerly عند الربط الأول', async () => {
        const { bindGlobalSearchBootHydrator } = await import('@/app/runtime/globalSearchBootHydrator');

        const unbind = bindGlobalSearchBootHydrator();
        expect(prefetchGlobalSearchInstantPaintCover).not.toHaveBeenCalled();
        expect(prefetchGlobalSearchOverlayChunk).not.toHaveBeenCalled();
        expect(hydrateGlobalSearchOverlayForInstantOpen).not.toHaveBeenCalled();
        unbind();
    });

    it('dashboard-interactive يسخّن قشرة الطلاء فقط بلا مقطع الواجهة', async () => {
        document.body.innerHTML = '';
        const { bindGlobalSearchBootHydrator } = await import('@/app/runtime/globalSearchBootHydrator');
        const unbind = bindGlobalSearchBootHydrator();
        window.dispatchEvent(new Event('hami:dashboard-interactive'));
        expect(prefetchGlobalSearchInstantPaintCover).toHaveBeenCalled();
        expect(prefetchGlobalSearchOverlayChunk).not.toHaveBeenCalled();
        expect(hydrateGlobalSearchOverlayForInstantOpen).not.toHaveBeenCalled();
        unbind();
    });
});
