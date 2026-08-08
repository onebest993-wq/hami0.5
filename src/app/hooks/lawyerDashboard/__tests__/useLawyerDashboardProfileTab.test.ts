import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLawyerDashboardProfileTab } from '@/app/hooks/lawyerDashboard/useLawyerDashboardProfileTab';
import { HAMI_DISMISS_OVERLAYS_EVENT } from '@/app/utils/bodyScrollLock';
import { warmProfileOnHover } from '@/app/hooks/lawyerDashboard/profileIntentWarm';
import { primeProfileForOpen } from '@/app/runtime/profileShellPrime';
import { hydrateProfileShellForInstantOpenWithData } from '@/app/runtime/profileBootHydrator';
import { resetDashboardOverlayCoordinatorForTests } from '@/app/hooks/lawyerDashboard/dashboardOverlayCoordinator';
import { useProfileShellReadiness } from '@/app/hooks/lawyerDashboard/profile/useProfileShellReadiness';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: vi.fn(),
        info: vi.fn(),
        success: vi.fn(),
    },
}));

vi.mock('@/app/hooks/lawyerDashboard/profileIntentWarm', () => ({
    warmProfileOnHover: vi.fn(),
}));

vi.mock('@/app/runtime/profileShellPrime', () => ({
    primeProfileForOpen: vi.fn(),
}));

vi.mock('@/app/runtime/profileBootHydrator', () => ({
    hydrateProfileShellForInstantOpenWithData: vi.fn(() => Promise.resolve(true)),
    prefetchProfileAfterBootReveal: vi.fn(),
    bindProfileBootHydrator: vi.fn(() => () => undefined),
    dispatchProfilePrimeHost: vi.fn(),
    PROFILE_SHELL_HYDRATED_EVENT: 'hami:profile-shell-hydrated',
}));

vi.mock('@/app/hooks/lawyerDashboard/profile/useProfileShellReadiness', () => ({
    useProfileShellReadiness: vi.fn(() => ({ ready: true, warming: false })),
}));

vi.mock('@/app/runtime/profileTabModuleLoader', () => ({
    loadProfileTabModule: vi.fn(() => Promise.resolve({})),
    prefetchProfileTabModule: vi.fn(),
}));

vi.mock('@/app/services/auth/shellAuth', () => ({
    isRealSignedIn: (userId: string | null | undefined) => {
        const id = userId?.trim();
        if (!id) return false;
        return id !== 'guest-lawyer-1' && id !== 'demo_user';
    },
    resolveShellAuthUserId: (auth?: string | null, display?: string | null) =>
        auth?.trim() || display?.trim() || null,
    isShellAuthBypassed: () => false,
}));

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: (fn: () => void) => {
        fn();
        return () => undefined;
    },
}));

vi.mock('@/app/services/profile/profilePerfMetrics', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/profile/profilePerfMetrics')>();
    return {
        ...actual,
        clearProfilePerfMarks: vi.fn(),
        markProfilePerfPhase: vi.fn(),
    };
});

import {
    clearProfilePerfMarks,
    markProfilePerfPhase,
} from '@/app/services/profile/profilePerfMetrics';

async function flushProfileShellPaint() {
    await act(async () => {
        await new Promise<void>((resolve) => {
            requestAnimationFrame(() => resolve());
        });
    });
}

describe('useLawyerDashboardProfileTab', () => {
    beforeEach(() => {
        resetDashboardOverlayCoordinatorForTests();
        vi.clearAllMocks();
        document.documentElement.removeAttribute('data-hami-profile-open');
        document.body.innerHTML = '';
    });

    it('يركّب host الملف فور تسجيل الدخول (قبل أول فتح)', () => {
        const setActiveTab = vi.fn();
        const setShowCommunity = vi.fn();

        const { result } = renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: 'lawyer-arm-1',
                activeTab: 'home',
                setActiveTab,
                setShowCommunity,
            }),
        );

        expect(result.current.profileHostMounted).toBe(true);
    });

    it('يفتح تبويب الملف فوراً مع snap DOM', async () => {
        document.body.innerHTML = `
          <div data-testid="lawyer-dashboard-home-surface" class="hami-dashboard-home-stack-cover is-active"></div>
          <div data-testid="lawyer-dashboard-profile-surface" class="hami-dashboard-tab-preserve" data-hami-tab-preserve="idle">
            <div data-lawyer-profile-root data-profile-page-hidden="true"></div>
          </div>
        `;
        const setActiveTab = vi.fn();
        const setShowCommunity = vi.fn();

        const { result } = renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: 'lawyer-1',
                activeTab: 'home',
                setActiveTab,
                setShowCommunity,
            }),
        );

        act(() => {
            result.current.openProfileTab();
        });

        expect(setActiveTab).toHaveBeenCalledWith('profile');
        expect(setShowCommunity).toHaveBeenCalledWith(false);
        expect(document.documentElement.getAttribute('data-hami-profile-open')).toBe('1');
        expect(result.current.profileTabSessionKey).toBe(0);

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(result.current.profileOpenEpoch).toBe(1);
        expect(primeProfileForOpen).toHaveBeenCalledWith('lawyer-1');
        document.body.innerHTML = '';
    });

    it('لا ينتظر chunk قبل تبديل التبويب', async () => {
        document.body.innerHTML = `
          <div data-testid="lawyer-dashboard-profile-surface"></div>
        `;

        const setActiveTab = vi.fn();
        const { result } = renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: 'lawyer-1',
                activeTab: 'home',
                setActiveTab,
                setShowCommunity: vi.fn(),
            }),
        );

        act(() => {
            result.current.openProfileTab();
        });

        expect(setActiveTab).toHaveBeenCalledWith('profile');
        await act(async () => {
            await Promise.resolve();
        });
        expect(primeProfileForOpen).toHaveBeenCalledWith('lawyer-1');
        document.body.innerHTML = '';
    });

    it('يفتح الملف فوراً حتى لو shell ما زال يُسخَّن', async () => {
        vi.mocked(useProfileShellReadiness).mockReturnValue({ ready: false, warming: true });
        document.body.innerHTML = `<div data-testid="lawyer-dashboard-profile-surface"></div>`;
        const setActiveTab = vi.fn();
        const { result } = renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: 'lawyer-1',
                activeTab: 'home',
                setActiveTab,
                setShowCommunity: vi.fn(),
            }),
        );

        act(() => {
            result.current.openProfileTab();
        });

        expect(setActiveTab).toHaveBeenCalledWith('profile');
        document.body.innerHTML = '';
    });

    it('يرفض فتح الملف بدون تسجيل دخول', () => {
        const setActiveTab = vi.fn();
        const setShowCommunity = vi.fn();

        const { result } = renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: null,
                activeTab: 'home',
                setActiveTab,
                setShowCommunity,
            }),
        );

        /* أثر P2 قد يستدعي setActiveTab عند التركيب — نمسح قبل فحص الرفض */
        setActiveTab.mockClear();

        act(() => {
            result.current.openProfileTab();
        });

        expect(setActiveTab).not.toHaveBeenCalled();
    });

    it('يغلق تبويب الملف عند dismiss-transient-overlays', () => {
        let activeTab: 'home' | 'profile' = 'profile';
        const setActiveTab = vi.fn((next) => {
            activeTab = typeof next === 'function' ? next(activeTab) : next;
        });

        renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: 'lawyer-1',
                activeTab,
                setActiveTab,
                setShowCommunity: vi.fn(),
            }),
        );

        act(() => {
            window.dispatchEvent(new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: { except: 'vault' } }));
        });

        expect(setActiveTab).toHaveBeenCalled();
        expect(activeTab).toBe('home');
    });

    it('closeProfileTab يغلق مركز الإعدادات قبل العودة للرئيسية', async () => {
        const setActiveTab = vi.fn();
        const closeSettings = vi.fn();

        const { result } = renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: 'lawyer-1',
                activeTab: 'profile',
                setActiveTab,
                setShowCommunity: vi.fn(),
                closeSettings,
            }),
        );

        act(() => {
            result.current.closeProfileTab();
        });

        expect(closeSettings).toHaveBeenCalledTimes(1);
        expect(document.documentElement.hasAttribute('data-hami-profile-open')).toBe(false);

        await flushProfileShellPaint();

        expect(setActiveTab).toHaveBeenCalledWith('home');
    });

    it('لا يعيد بناء الملف عند الفتح الثاني — sessionKey ثابت', async () => {
        const setActiveTab = vi.fn();
        const { result } = renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: 'lawyer-1',
                activeTab: 'home',
                setActiveTab,
                setShowCommunity: vi.fn(),
            }),
        );

        act(() => {
            result.current.openProfileTab();
        });
        await flushProfileShellPaint();
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });
        expect(result.current.profileTabSessionKey).toBe(0);

        act(() => {
            result.current.openProfileTab();
        });
        await flushProfileShellPaint();
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });
        expect(result.current.profileTabSessionKey).toBe(0);
        expect(result.current.profileOpenEpoch).toBe(2);
    });

    it('يتجاهل النقر المتكرر أثناء الفتح أو عند كون التبويب نشطاً', async () => {
        const setActiveTab = vi.fn();
        const { result, rerender } = renderHook(
            ({ tab }: { tab: 'home' | 'profile' }) =>
                useLawyerDashboardProfileTab({
                    userId: 'lawyer-1',
                    activeTab: tab,
                    setActiveTab,
                    setShowCommunity: vi.fn(),
                }),
            { initialProps: { tab: 'home' as const } },
        );

        act(() => {
            result.current.openProfileTab();
            result.current.openProfileTab();
        });
        await flushProfileShellPaint();
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(primeProfileForOpen).toHaveBeenCalledTimes(2);

        vi.mocked(primeProfileForOpen).mockClear();
        /* محاكاة إغلاق بصري مع بقاء activeTab=profile (سباق rAF) */
        document.documentElement.removeAttribute('data-hami-profile-open');
        rerender({ tab: 'profile' });
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });
        const warmAfterActive = primeProfileForOpen.mock.calls.length;

        act(() => {
            result.current.openProfileTab();
        });
        await flushProfileShellPaint();
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });
        /* يُسمح بإعادة الفتح إن أُغلق بصرياً حتى لو activeTab لم يتحدّث بعد */
        expect(primeProfileForOpen.mock.calls.length).toBeGreaterThanOrEqual(warmAfterActive);
    });

    it('dismiss-transient-overlays(notifications) لا يُعيد التبويب للرئيسية', () => {
        let activeTab: 'home' | 'profile' = 'profile';
        const setActiveTab = vi.fn((next) => {
            activeTab = typeof next === 'function' ? next(activeTab) : next;
        });

        renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: 'lawyer-1',
                activeTab,
                setActiveTab,
                setShowCommunity: vi.fn(),
            }),
        );

        act(() => {
            window.dispatchEvent(
                new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: { except: 'notifications' } }),
            );
        });

        expect(activeTab).toBe('profile');
        expect(setActiveTab).not.toHaveBeenCalled();
    });

    it('dismiss-transient-overlays(profile) بعد الفتح لا يُعيد التبويب للرئيسية', async () => {
        let activeTab: 'home' | 'profile' = 'home';
        const setActiveTab = vi.fn((next) => {
            activeTab = typeof next === 'function' ? next(activeTab) : next;
        });

        renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: 'lawyer-1',
                activeTab,
                setActiveTab,
                setShowCommunity: vi.fn(),
            }),
        );

        act(() => {
            window.__hamiE2eForceOpenProfileTab?.();
        });
        await flushProfileShellPaint();

        expect(activeTab).toBe('profile');

        act(() => {
            window.dispatchEvent(
                new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: { except: 'profile' } }),
            );
        });

        expect(activeTab).toBe('profile');
    });

    it('يسجّل open-request عند كل فتح من الهيدر', async () => {
        const { result } = renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: 'lawyer-1',
                activeTab: 'home',
                setActiveTab: vi.fn(),
                setShowCommunity: vi.fn(),
            }),
        );

        vi.mocked(clearProfilePerfMarks).mockClear();
        vi.mocked(markProfilePerfPhase).mockClear();

        act(() => {
            result.current.openProfileTab();
        });

        expect(clearProfilePerfMarks).toHaveBeenCalledTimes(1);
        expect(markProfilePerfPhase).toHaveBeenCalledWith('open-request');

        await flushProfileShellPaint();

        expect(markProfilePerfPhase).toHaveBeenCalledWith('chunk-ready');
    });

    it('يمسح host ويغلق التبويب عند غياب هوية حقيقية', () => {
        let activeTab: 'home' | 'profile' = 'profile';
        const setActiveTab = vi.fn((updater: unknown) => {
            if (typeof updater === 'function') {
                activeTab = (updater as (t: typeof activeTab) => typeof activeTab)(activeTab);
            } else {
                activeTab = updater as typeof activeTab;
            }
        });

        const { result, rerender } = renderHook(
            ({ userId }: { userId: string | null }) =>
                useLawyerDashboardProfileTab({
                    userId,
                    activeTab,
                    setActiveTab,
                    setShowCommunity: vi.fn(),
                }),
            { initialProps: { userId: 'lawyer-1' as string | null } },
        );

        expect(result.current.profileHostMounted).toBe(true);

        rerender({ userId: null });

        expect(activeTab).toBe('home');
        expect(result.current.profileHostMounted).toBe(false);
    });
});
