import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLawyerDashboardSettings } from '@/app/hooks/lawyerDashboard/useLawyerDashboardSettings';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

vi.mock('@/app/runtime/hamiSettingsLoader', () => ({
    loadHamiSettingsModule: vi.fn(() => Promise.resolve({ HamiSettings: vi.fn() })),
    prefetchHamiSettingsModule: vi.fn(),
    isHamiSettingsModuleResolved: vi.fn(() => false),
}));

vi.mock('@/app/runtime/settingsBootHydrator', () => ({
    SETTINGS_SHELL_HYDRATED_EVENT: 'hami:settings-shell-hydrated',
    hydrateSettingsShellForInstantOpen: vi.fn(() => Promise.resolve(true)),
    isSettingsShellFullyHydrated: vi.fn(() => false),
    bindSettingsBootHydrator: vi.fn(() => () => undefined),
    dispatchSettingsPrimeHost: vi.fn(),
}));

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: (fn: () => void) => {
        fn();
        return () => undefined;
    },
}));

vi.mock('@/app/hooks/lawyerDashboard/settingsIntentWarm', () => ({
    warmSettingsOnHover: vi.fn(),
    warmSettingsOnOpen: vi.fn(),
    primeSettingsShellForOpen: vi.fn(),
}));

/** @deprecated — استخدم useLawyerDashboardSettings.test.ts */
describe('useLawyerDashboardOverlays — الإعدادات (legacy)', () => {
    beforeEach(() => vi.clearAllMocks());

    it('يُعاد توجيه الاختبار إلى useLawyerDashboardSettings', async () => {
        const { result } = renderHook(() => useLawyerDashboardSettings('lawyer-1'));
        await act(async () => {
            result.current.openSettings();
            await Promise.resolve();
        });
        expect(result.current.showSettings).toBe(true);
        expect(result.current.settingsHostMounted).toBe(true);
    });
});
