import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadHamiSettingsModule = vi.fn(() => Promise.resolve({ HamiSettings: vi.fn() }));
const preloadAllSettingsSectionComponents = vi.fn(() => Promise.resolve());
const loadSettingsSection = vi.fn(() => Promise.resolve({}));

vi.mock('@/app/runtime/hamiSettingsLoader', () => ({
    isHamiSettingsModuleResolved: vi.fn(() => false),
    loadHamiSettingsModule: (...args: unknown[]) => loadHamiSettingsModule(...args),
}));

vi.mock('@/app/components/lawyer/HamiSettings/settingsSectionRegistry', () => ({
    preloadAllSettingsSectionComponents: (...args: unknown[]) =>
        preloadAllSettingsSectionComponents(...args),
}));

vi.mock('@/app/components/lawyer/HamiSettings/settingsSectionLoader', () => ({
    loadSettingsSection: (...args: unknown[]) => loadSettingsSection(...args),
}));

vi.mock('@/app/components/lawyer/HamiSettings/settingsSectionPersistence', () => ({
    readPersistedSettingsSection: vi.fn(() => 'appearance'),
}));

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: vi.fn(() => false),
}));

vi.mock('@/app/services/settings/settingsRuntime', () => ({
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

    it('hydrateSettingsShellForInstantOpen يحمّل shell وجميع التبويبات', async () => {
        const { hydrateSettingsShellForInstantOpen, SETTINGS_SHELL_HYDRATED_EVENT } = await import(
            '@/app/runtime/settingsBootHydrator'
        );

        const onHydrated = vi.fn();
        window.addEventListener(SETTINGS_SHELL_HYDRATED_EVENT, onHydrated);

        const ok = await hydrateSettingsShellForInstantOpen(true);

        expect(ok).toBe(true);
        expect(loadHamiSettingsModule).toHaveBeenCalledTimes(1);
        expect(preloadAllSettingsSectionComponents).toHaveBeenCalledTimes(1);
        expect(loadSettingsSection).toHaveBeenCalledWith('appearance');
        expect(onHydrated).toHaveBeenCalledTimes(1);

        window.removeEventListener(SETTINGS_SHELL_HYDRATED_EVENT, onHydrated);
    });

    it('hydrateSettingsShellForInstantOpen(false) يتخطى التحميل عند تعطيل prefetch', async () => {
        const { getLawyerSettingsSnapshot } = await import('@/app/services/settings/settingsRuntime');
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
