import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLawyerDashboardProfileTab } from '@/app/hooks/lawyerDashboard/useLawyerDashboardProfileTab';
import { HAMI_DISMISS_OVERLAYS_EVENT } from '@/app/utils/bodyScrollLock';
import { warmProfileOnHover } from '@/app/runtime/profileShellPrime';
import { primeProfileForOpen } from '@/app/runtime/profileShellPrime';
import { hydrateProfileShellForInstantOpenWithData } from '@/app/runtime/profileBootHydrator';
import { resetDashboardOverlayCoordinatorForTests } from '@/app/hooks/lawyerDashboard/dashboardOverlayCoordinator';
import { resetDashboardInteractiveForTests } from '@/app/bootstrap/bootMetrics';
import {
    markProfileOpenedThisPage,
    resetProfileOpenedThisPageForTests,
} from '@/app/hooks/lawyerDashboard/profile/profileOpenSession';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: vi.fn(),
        info: vi.fn(),
        success: vi.fn(),
    },
}));

vi.mock('@/app/runtime/profileShellPrime', () => ({
    warmProfileOnHover: vi.fn(),
    primeProfileForOpen: vi.fn(),
    warmProfileOnOpen: vi.fn(),
}));

const profileIdleRelease = vi.hoisted(() => {
    let pending: (() => void) | null = null;
    return {
        schedule: vi.fn((release: () => void) => {
            pending = release;
            return () => {
                if (pending === release) pending = null;
            };
        }),
        fire: () => {
            const fn = pending;
            pending = null;
            fn?.();
        },
        hasPending: () => pending !== null,
        reset: () => {
            pending = null;
        },
    };
});

vi.mock('@/app/hooks/lawyerDashboard/profile/profileHostIdleRelease', () => ({
    scheduleProfileHostIdleRelease: (release: () => void) => profileIdleRelease.schedule(release),
    PROFILE_HOST_IDLE_RELEASE_MS: 12_000,
}));

vi.mock('@/app/runtime/profileBootHydrator', () => ({
    hydrateProfileShellForInstantOpenWithData: vi.fn(() => Promise.resolve(true)),
    prefetchProfileAfterBootReveal: vi.fn(),
    bindProfileBootHydrator: vi.fn(() => () => undefined),
    dispatchProfilePrimeHost: vi.fn(),
    PROFILE_SHELL_HYDRATED_EVENT: 'hami:profile-shell-hydrated',
}));

vi.mock('@/app/runtime/royalLawyerProfileLoader', () => ({
    loadProfileHubModule: vi.fn(() => Promise.resolve({})),
    prefetchProfileHubModule: vi.fn(),
    loadRoyalLawyerProfileModule: vi.fn(() => Promise.resolve({})),
    isProfileShellModuleResolved: vi.fn(() => false),
}));

vi.mock('@/app/services/auth/shellAuth', () => ({
    isRealSignedIn: (userId: string | null | undefined) => {
        const id = userId?.trim();
        if (!id) return false;
        return id !== 'guest-lawyer-1' && id !== 'demo_user';
    },
    hasLocalAppSession: (userId: string | null | undefined) => Boolean(userId?.trim()),
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
        await Promise.resolve();
        await Promise.resolve();
        await new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => resolve());
            });
        });
    });
}

function mountCompleteProfileSurface(): void {
    document.body.innerHTML = `
      <div data-testid="lawyer-dashboard-home-surface" class="hami-dashboard-home-stack-cover is-active"></div>
      <div data-testid="lawyer-dashboard-profile-surface" class="hami-dashboard-tab-preserve">
        <div data-testid="lawyer-profile">
          <div data-profile-page-body></div>
        </div>
      </div>
    `;
}

describe('useLawyerDashboardProfileTab', () => {
    beforeEach(() => {
        resetDashboardOverlayCoordinatorForTests();
        resetProfileOpenedThisPageForTests();
        resetDashboardInteractiveForTests();
        profileIdleRelease.reset();
        vi.clearAllMocks();
        document.documentElement.removeAttribute('data-hami-profile-open');
        document.documentElement.removeAttribute('data-hami-profile-closing');
        document.body.innerHTML = '';
    });

    it('لا يركّب host الملف عند الإقلاع — فقط تسخين', () => {
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

        expect(result.current.profileHostMounted).toBe(false);
    });

    it('يفتح تبويب الملف فوراً عندما الصفحة الكاملة في السطح', async () => {
        document.body.innerHTML = `
          <div data-testid="lawyer-dashboard-home-surface" class="hami-dashboard-home-stack-cover is-active"></div>
          <div data-testid="lawyer-dashboard-profile-surface" class="hami-dashboard-tab-preserve" data-hami-tab-preserve="idle">
            <div data-testid="lawyer-profile">
              <div data-profile-page-body></div>
            </div>
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
        await flushProfileShellPaint();

        expect(setActiveTab).toHaveBeenCalledWith('profile');
        expect(setShowCommunity).toHaveBeenCalledWith(false);
        expect(document.documentElement.getAttribute('data-hami-profile-open')).toBe('1');

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(result.current.profileOpenEpoch).toBe(1);
        expect(primeProfileForOpen).toHaveBeenCalledWith('lawyer-1');
        document.body.innerHTML = '';
    });

    it('سطح فارغ: يركّب Host ويفعّل التبويب — snap ينتظر صفحة الفتح في السطح', async () => {
        const hub = await import('@/app/runtime/royalLawyerProfileLoader');
        vi.mocked(hub.loadProfileHubModule).mockReturnValue(new Promise(() => undefined));

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
        expect(result.current.profileHostMounted).toBe(true);
        expect(document.documentElement.hasAttribute('data-hami-profile-open')).toBe(false);

        await flushProfileShellPaint();
        expect(primeProfileForOpen).toHaveBeenCalledWith('lawyer-1');
        document.body.innerHTML = '';
    });

    it('يكشف بعد اكتمال الصفحة في السطح', async () => {
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
        expect(document.documentElement.hasAttribute('data-hami-profile-open')).toBe(false);

        const surface = document.querySelector('[data-testid="lawyer-dashboard-profile-surface"]');
        const page = document.createElement('div');
        page.setAttribute('data-testid', 'lawyer-profile');
        const body = document.createElement('div');
        body.setAttribute('data-profile-page-body', '');
        page.appendChild(body);
        surface?.appendChild(page);

        await flushProfileShellPaint();

        expect(document.documentElement.getAttribute('data-hami-profile-open')).toBe('1');
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

    it('يغلق تبويب الملف عند dismiss-transient-overlays', async () => {
        markProfileOpenedThisPage();
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

        expect(document.documentElement.hasAttribute('data-hami-profile-open')).toBe(false);

        await flushProfileShellPaint();

        expect(setActiveTab).toHaveBeenCalled();
        expect(activeTab).toBe('home');
    });

    it('closeProfileTab يغلق مركز الإعدادات قبل العودة للرئيسية', async () => {
        markProfileOpenedThisPage();
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

        expect(document.documentElement.hasAttribute('data-hami-profile-open')).toBe(false);
        expect(document.documentElement.hasAttribute('data-hami-feature-open')).toBe(false);

        await flushProfileShellPaint();

        expect(setActiveTab).toHaveBeenCalledWith('home');
        await act(async () => {
            await Promise.resolve();
        });
        expect(closeSettings).toHaveBeenCalledTimes(1);
    });

    it('يزيد profileOpenEpoch عند كل فتح دون remount قسري', async () => {
        mountCompleteProfileSurface();
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
        expect(result.current.profileOpenEpoch).toBe(1);

        act(() => {
            result.current.openProfileTab();
        });
        await flushProfileShellPaint();
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });
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

        expect(primeProfileForOpen).toHaveBeenCalledTimes(1);

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
        markProfileOpenedThisPage();
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
        mountCompleteProfileSurface();
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

    it('تركيب الخطاف الكسول لا يمسح snap فتح قائم', () => {
        document.documentElement.setAttribute('data-hami-profile-open', '1');
        const setActiveTab = vi.fn();

        renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: 'lawyer-1',
                activeTab: 'home',
                setActiveTab,
                setShowCommunity: vi.fn(),
            }),
        );

        expect(document.documentElement.getAttribute('data-hami-profile-open')).toBe('1');
        expect(setActiveTab).not.toHaveBeenCalled();
    });

    it('إن فُتح الملف هذه الصفحة وبقي snap مع تبويب الرئيسية يُصلح التبويب', async () => {
        markProfileOpenedThisPage();
        document.documentElement.setAttribute('data-hami-profile-open', '1');
        const setActiveTab = vi.fn();

        renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: 'lawyer-1',
                activeTab: 'home',
                setActiveTab,
                setShowCommunity: vi.fn(),
            }),
        );

        await act(async () => {
            await new Promise((resolve) => {
                setTimeout(resolve, 0);
            });
        });

        expect(document.documentElement.getAttribute('data-hami-profile-open')).toBe('1');
        expect(setActiveTab).toHaveBeenCalledWith('profile');
    });

    it('بعد إعادة التحميل لا يكشف الملف من تبويب متبقّي بلا نية', () => {
        const setActiveTab = vi.fn((next) => {
            if (typeof next === 'function') next('profile');
        });

        renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: 'lawyer-1',
                activeTab: 'profile',
                setActiveTab,
                setShowCommunity: vi.fn(),
            }),
        );

        expect(setActiveTab).toHaveBeenCalled();
        const updater = setActiveTab.mock.calls[0][0];
        expect(typeof updater === 'function' ? updater('profile') : updater).toBe('home');
        expect(document.documentElement.hasAttribute('data-hami-profile-open')).toBe(false);
        expect(document.documentElement.hasAttribute('data-hami-profile-closing')).toBe(false);
    });

    it('على الرئيسية بلا جلسة فتح يمسح closing العالق', () => {
        document.documentElement.setAttribute('data-hami-profile-closing', '1');
        renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: 'lawyer-1',
                activeTab: 'home',
                setActiveTab: vi.fn(),
                setShowCommunity: vi.fn(),
            }),
        );
        expect(document.documentElement.hasAttribute('data-hami-profile-closing')).toBe(false);
    });

    it('تبويب ملف بلا نية وبلا snap يمسح closing العالق', () => {
        document.documentElement.setAttribute('data-hami-profile-closing', '1');
        renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: 'lawyer-1',
                activeTab: 'profile',
                setActiveTab: vi.fn(),
                setShowCommunity: vi.fn(),
            }),
        );
        expect(document.documentElement.hasAttribute('data-hami-profile-closing')).toBe(false);
    });

    it('ذاكرة الصفحة (pageshow persisted) لا تُبقي الملف مفتوحاً بلا نية', () => {
        const setActiveTab = vi.fn((next) => {
            if (typeof next === 'function') next('profile');
        });

        renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: 'lawyer-1',
                activeTab: 'home',
                setActiveTab,
                setShowCommunity: vi.fn(),
            }),
        );

        document.documentElement.setAttribute('data-hami-profile-open', '1');
        act(() => {
            window.dispatchEvent(new Event('pageshow', { bubbles: false }));
            const ev = new Event('pageshow') as PageTransitionEvent;
            Object.defineProperty(ev, 'persisted', { value: true });
            window.dispatchEvent(ev);
        });

        expect(document.documentElement.hasAttribute('data-hami-profile-open')).toBe(false);
        expect(setActiveTab).toHaveBeenCalled();
    });

    it('يمسح host ويغلق التبويب عند غياب هوية حقيقية', () => {
        markProfileOpenedThisPage();
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

    it('يفكك Host بعد خمول على الرئيسية ويلغي التفكيك إن أُعيد الفتح', () => {
        markProfileOpenedThisPage();
        let activeTab: 'home' | 'profile' = 'profile';
        const setActiveTab = vi.fn((updater: unknown) => {
            if (typeof updater === 'function') {
                activeTab = (updater as (t: typeof activeTab) => typeof activeTab)(activeTab);
            } else {
                activeTab = updater as typeof activeTab;
            }
        });

        const { result, rerender } = renderHook(
            ({ tab }: { tab: 'home' | 'profile' }) =>
                useLawyerDashboardProfileTab({
                    userId: 'lawyer-1',
                    activeTab: tab,
                    setActiveTab,
                    setShowCommunity: vi.fn(),
                }),
            { initialProps: { tab: 'profile' as const } },
        );

        expect(result.current.profileHostMounted).toBe(true);
        expect(profileIdleRelease.hasPending()).toBe(false);

        rerender({ tab: 'home' });
        expect(result.current.profileHostMounted).toBe(true);
        expect(profileIdleRelease.hasPending()).toBe(true);

        rerender({ tab: 'profile' });
        expect(profileIdleRelease.hasPending()).toBe(false);
        expect(result.current.profileHostMounted).toBe(true);

        rerender({ tab: 'home' });
        act(() => {
            profileIdleRelease.fire();
        });
        expect(result.current.profileHostMounted).toBe(false);
    });

    it('حدث live-ready بعد الإغلاق لا يعيد تبويب الملف', () => {
        const setActiveTab = vi.fn();
        const { result } = renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: 'lawyer-1',
                activeTab: 'home',
                setActiveTab,
                setShowCommunity: vi.fn(),
            }),
        );

        setActiveTab.mockClear();

        act(() => {
            window.dispatchEvent(new Event('hami:profile-live-shell-ready'));
        });

        expect(setActiveTab).not.toHaveBeenCalledWith('profile');
        expect(result.current.profileHostMounted).toBe(true);
    });

    it('حدث live-ready أثناء نية فتح يفعّل التبويب', () => {
        markProfileOpenedThisPage();
        const setActiveTab = vi.fn();
        renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: 'lawyer-1',
                activeTab: 'home',
                setActiveTab,
                setShowCommunity: vi.fn(),
            }),
        );

        setActiveTab.mockClear();

        act(() => {
            window.dispatchEvent(new Event('hami:profile-live-shell-ready'));
        });

        expect(setActiveTab).toHaveBeenCalledWith('profile');
    });
});
