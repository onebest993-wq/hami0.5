import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
    resetSettingsOpenWarmForTests,
    useLawyerDashboardSettings,
} from '@/app/hooks/lawyerDashboard/useLawyerDashboardSettings';
import { resetDashboardInteractiveForTests } from '@/app/bootstrap/bootMetrics';
import { LAWYER_SETTINGS_OPEN_KEY } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';

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

vi.mock('@/app/runtime/settingsOverlayEntryLoader', () => ({
    prefetchSettingsOverlayEntry: vi.fn(),
    loadSettingsOverlayEntry: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@/app/hooks/lawyerDashboard/settingsIntentWarm', () => ({
    warmSettingsOnHover: vi.fn(),
    warmSettingsOnOpen: vi.fn(),
    primeSettingsShellForOpen: vi.fn(),
}));

/** @deprecated — العقد الكامل في useLawyerDashboardSettings.test.ts */
describe('useLawyerDashboardOverlays — الإعدادات (legacy)', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        resetSettingsOpenWarmForTests();
        resetDashboardInteractiveForTests();
        try {
            sessionStorage.removeItem(LAWYER_SETTINGS_OPEN_KEY);
        } catch {
            /* ignore */
        }
        const paint = await import('@/app/runtime/settingsInstantPaint');
        paint.clearSettingsReopenSuppress();
        const snap = await import('@/app/services/settings/settingsShellSnap');
        snap.resetSettingsShellSnapForTests();
    });

    async function flushOpenFrame() {
        await act(async () => {
            await new Promise<void>((resolve) => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setTimeout(resolve, 0);
                    });
                });
            });
        });
    }

    it('يُعاد توجيه الاختبار إلى useLawyerDashboardSettings', async () => {
        const { result } = renderHook(() => useLawyerDashboardSettings('lawyer-1'));
        act(() => {
            result.current.openSettings();
        });
        await flushOpenFrame();
        expect(result.current.showSettings).toBe(true);
        expect(result.current.settingsHostMounted).toBe(true);
    });
});
