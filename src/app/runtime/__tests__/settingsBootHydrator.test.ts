import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadHamiSettingsModule = vi.fn(() => Promise.resolve({ HamiSettings: vi.fn() }));

vi.mock('@/app/runtime/hamiSettingsLoader', () => ({
    isHamiSettingsModuleResolved: vi.fn(() => false),
    loadHamiSettingsModule: (...args: unknown[]) => loadHamiSettingsModule(...args),
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

describe('settingsBootHydrator', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        const mod = await import('@/app/runtime/settingsBootHydrator');
        mod.resetSettingsBootHydratorForTests();
        vi.mocked(
            (await import('@/app/runtime/hamiSettingsLoader')).isHamiSettingsModuleResolved,
        ).mockReturnValue(false);
    });

    it('hydrateSettingsShellForInstantOpen يحمّل مقطع الإعدادات مرة واحدة', async () => {
        const { hydrateSettingsShellForInstantOpen } = await import(
            '@/app/runtime/settingsBootHydrator'
        );
        const { SETTINGS_SHELL_HYDRATED_EVENT } = await import('@/app/runtime/settingsShellEvents');

        const onHydrated = vi.fn();
        window.addEventListener(SETTINGS_SHELL_HYDRATED_EVENT, onHydrated);

        const ok = await hydrateSettingsShellForInstantOpen(true);

        expect(ok).toBe(true);
        expect(loadHamiSettingsModule).toHaveBeenCalledTimes(1);
        expect(onHydrated).toHaveBeenCalledTimes(1);

        window.removeEventListener(SETTINGS_SHELL_HYDRATED_EVENT, onHydrated);
    });

    it('hydrateSettingsShellForInstantOpen(false) يتخطى التحميل عند تعطيل prefetch', async () => {
        const { getLawyerSettingsSnapshot } = await import('@/app/services/settings/settingsSnapshot');
        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: true },
            performance: { prefetchScreens: false, litePerformance: false },
        } as never);

        const { hydrateSettingsShellForInstantOpen } = await import('@/app/runtime/settingsBootHydrator');

        const blocked = await hydrateSettingsShellForInstantOpen(false);
        expect(blocked).toBe(false);
        expect(loadHamiSettingsModule).not.toHaveBeenCalled();

        loadHamiSettingsModule.mockClear();
        const forced = await hydrateSettingsShellForInstantOpen(true);
        expect(forced).toBe(true);
        expect(loadHamiSettingsModule).toHaveBeenCalledTimes(1);
    });
});
