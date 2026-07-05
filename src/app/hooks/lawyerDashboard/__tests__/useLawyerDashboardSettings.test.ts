import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLawyerDashboardSettings } from '@/app/hooks/lawyerDashboard/useLawyerDashboardSettings';
import { HAMI_DISMISS_OVERLAYS_EVENT } from '@/app/utils/bodyScrollLock';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: vi.fn(),
        info: vi.fn(),
        success: vi.fn(),
    },
}));

vi.mock('@/app/runtime/hamiSettingsLoader', () => ({
    loadHamiSettingsModule: vi.fn(() => Promise.resolve({})),
    prefetchHamiSettingsModule: vi.fn(),
    isHamiSettingsModuleResolved: vi.fn(() => false),
}));

vi.mock('@/app/runtime/settingsBootHydrator', () => ({
    SETTINGS_SHELL_HYDRATED_EVENT: 'hami:settings-shell-hydrated',
    hydrateSettingsShellForInstantOpen: vi.fn(() => Promise.resolve(true)),
    isSettingsShellFullyHydrated: vi.fn(() => false),
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

import { warmSettingsOnHover, warmSettingsOnOpen } from '@/app/hooks/lawyerDashboard/settingsIntentWarm';

describe('useLawyerDashboardSettings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('primeSettingsShellMount ي arm الـ host و prefetch — بلا فتح', () => {
        const { result } = renderHook(() => useLawyerDashboardSettings('lawyer-1'));
        act(() => {
            result.current.primeSettingsShellMount();
        });
        expect(result.current.showSettings).toBe(false);
        expect(result.current.settingsHostMounted).toBe(true);
        expect(warmSettingsOnHover).toHaveBeenCalled();
    });

    it('يفتح الإعدادات فوراً ويسخّن قبل عرض الـ shell', async () => {
        const { result } = renderHook(() => useLawyerDashboardSettings('lawyer-1'));

        await act(async () => {
            result.current.openSettings();
            await Promise.resolve();
        });

        expect(warmSettingsOnOpen).toHaveBeenCalledTimes(1);
        expect(result.current.showSettings).toBe(true);
    });

    it('يتجاهل النقر المتكرر أثناء الفتح أو عند كون الإعدادات مفتوحة', async () => {
        const { result } = renderHook(() => useLawyerDashboardSettings('lawyer-1'));

        await act(async () => {
            result.current.openSettings();
            result.current.openSettings();
            result.current.openSettings();
            await Promise.resolve();
        });

        expect(warmSettingsOnOpen).toHaveBeenCalledTimes(1);
        expect(result.current.showSettings).toBe(true);
    });

    it('يبقي مفتاح الجلسة ثابتاً عند إعادة الفتح', async () => {
        const { result } = renderHook(() => useLawyerDashboardSettings('lawyer-1'));

        await act(async () => {
            result.current.openSettings();
            await Promise.resolve();
        });
        const first = result.current.settingsSessionKey;

        await act(async () => {
            result.current.closeSettings();
            result.current.openSettings();
            await Promise.resolve();
        });

        expect(result.current.settingsSessionKey).toBe(first);
        expect(result.current.showSettings).toBe(true);
    });

    it('يرفض فتح الإعدادات بدون تسجيل دخول', () => {
        const { result } = renderHook(() => useLawyerDashboardSettings(null));

        act(() => {
            result.current.openSettings();
        });

        expect(result.current.showSettings).toBe(false);
    });

    it('يغلق الإعدادات عند dismiss-transient-overlays', () => {
        const { result } = renderHook(() => useLawyerDashboardSettings('lawyer-1'));

        act(() => {
            result.current.setShowSettings(true);
        });

        act(() => {
            window.dispatchEvent(new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: { except: 'vault' } }));
        });

        expect(result.current.showSettings).toBe(false);
    });
});
