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

import { warmSettingsOnHover, warmSettingsOnOpen } from '@/app/hooks/lawyerDashboard/settingsIntentWarm';

describe('useLawyerDashboardSettings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    async function flushOpenFrame() {
        await act(async () => {
            await Promise.resolve();
        });
    }

    it('primeSettingsShellMount ي arm الـ host و prefetch — بلا فتح', () => {
        const { result } = renderHook(() => useLawyerDashboardSettings('lawyer-1'));
        act(() => {
            result.current.primeSettingsShellMount();
        });
        expect(result.current.showSettings).toBe(false);
        expect(result.current.settingsHostMounted).toBe(true);
        expect(warmSettingsOnHover).toHaveBeenCalled();
    });

    it('بعد prime + conceal الطبقة لا يُبتلع فتح الترس (سباق pointerdown)', async () => {
        const paint = await import('@/app/runtime/settingsInstantPaint');
        paint.clearSettingsReopenSuppress();
        const { result } = renderHook(() => useLawyerDashboardSettings('lawyer-1'));

        act(() => {
            result.current.primeSettingsShellMount();
            /* مسار قديم معطوب: mount مغلق → conceal يكبح — الآن بلا كبح */
            paint.concealSettingsWarmShell();
        });
        expect(paint.isSettingsReopenSuppressed()).toBe(false);

        act(() => {
            result.current.openSettings();
        });
        await flushOpenFrame();

        expect(result.current.showSettings).toBe(true);
    });

    it('يفتح الإعدادات فوراً ويسخّن قبل عرض الـ shell', async () => {
        const { result } = renderHook(() => useLawyerDashboardSettings('lawyer-1'));

        act(() => {
            result.current.openSettings();
        });
        await flushOpenFrame();

        expect(warmSettingsOnOpen).toHaveBeenCalled();
        expect(result.current.showSettings).toBe(true);
    });

    it('يتجاهل النقر المتكرر أثناء الفتح أو عند كون الإعدادات مفتوحة', async () => {
        const { result } = renderHook(() => useLawyerDashboardSettings('lawyer-1'));

        act(() => {
            result.current.openSettings();
            result.current.openSettings();
            result.current.openSettings();
        });
        await flushOpenFrame();

        expect(warmSettingsOnOpen).toHaveBeenCalled();
        expect(result.current.showSettings).toBe(true);
    });

    it('يبقي مفتاح الجلسة ثابتاً عند إعادة الفتح', async () => {
        const { clearSettingsReopenSuppress } = await import('@/app/runtime/settingsInstantPaint');
        const { result } = renderHook(() => useLawyerDashboardSettings('lawyer-1'));

        act(() => {
            result.current.openSettings();
        });
        await flushOpenFrame();
        const first = result.current.settingsSessionKey;

        act(() => {
            result.current.closeSettings();
        });
        clearSettingsReopenSuppress();
        act(() => {
            result.current.openSettings();
        });
        await flushOpenFrame();

        expect(result.current.settingsSessionKey).toBe(first);
        expect(result.current.showSettings).toBe(true);
    });

    it('يرفض فتح الإعدادات بدون تسجيل دخول', async () => {
        const { isShellAuthBypassed } = await import('@/app/services/auth/shellAuth');
        const { result } = renderHook(() => useLawyerDashboardSettings(null));

        await act(async () => {
            if (result.current.showSettings) result.current.closeSettings();
            await Promise.resolve();
        });

        act(() => {
            result.current.openSettings();
        });
        await flushOpenFrame();

        if (isShellAuthBypassed()) {
            expect(result.current.showSettings).toBe(true);
        } else {
            expect(result.current.showSettings).toBe(false);
        }
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

    it('يغلق ويمسح host عند غياب هوية حقيقية', async () => {
        const { clearSettingsReopenSuppress } = await import('@/app/runtime/settingsInstantPaint');
        clearSettingsReopenSuppress();
        const shellAuth = await import('@/app/services/auth/shellAuth');
        const spy = vi.spyOn(shellAuth, 'isRealSignedIn').mockImplementation((id) => Boolean(id?.trim()));

        try {
            const { result, rerender } = renderHook(
                ({ uid }: { uid: string | null }) => useLawyerDashboardSettings(uid),
                { initialProps: { uid: 'lawyer-1' as string | null } },
            );

            act(() => {
                result.current.openSettings();
            });
            await flushOpenFrame();
            expect(result.current.showSettings).toBe(true);
            expect(result.current.settingsHostMounted).toBe(true);

            await act(async () => {
                rerender({ uid: null });
                await Promise.resolve();
            });

            expect(result.current.showSettings).toBe(false);
            expect(result.current.settingsHostMounted).toBe(false);
        } finally {
            spy.mockRestore();
            clearSettingsReopenSuppress();
        }
    });
});
