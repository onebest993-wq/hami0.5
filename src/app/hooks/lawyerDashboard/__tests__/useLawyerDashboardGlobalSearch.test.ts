import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';
import { useLawyerDashboardGlobalSearch } from '@/app/hooks/lawyerDashboard/useLawyerDashboardGlobalSearch';
import { HAMI_DISMISS_OVERLAYS_EVENT } from '@/app/utils/bodyScrollLock';
import { concealGlobalSearchWarmShell } from '@/app/runtime/globalSearchInstantPaint';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { warmGlobalSearchOnOpen } from '@/app/hooks/lawyerDashboard/globalSearchIntentWarm';
import { LAWYER_GLOBAL_SEARCH_OPEN_KEY } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: vi.fn(),
        info: vi.fn(),
        success: vi.fn(),
    },
}));

vi.mock('@/app/hooks/lawyerDashboard/globalSearchIntentWarm', () => ({
    warmGlobalSearchOnHover: vi.fn(),
    warmGlobalSearchOnOpen: vi.fn(),
}));

vi.mock('@/app/runtime/globalSearchBootHydrator', () => ({
    GLOBAL_SEARCH_SHELL_HYDRATED_EVENT: 'hami:global-search-shell-hydrated',
    hydrateGlobalSearchShellForInstantOpen: vi.fn(() => Promise.resolve(true)),
    bindGlobalSearchBootHydrator: vi.fn(() => () => undefined),
}));

vi.mock('@/app/runtime/globalSearchInstantPaint', () => ({
    revealGlobalSearchWarmShell: vi.fn(() => false),
    concealGlobalSearchWarmShell: vi.fn(),
    paintGlobalSearchInstantChrome: vi.fn(() => true),
    beginGlobalSearchDismissLock: vi.fn(),
    GLOBAL_SEARCH_INSTANT_DISMISS_EVENT: 'hami-gs-instant-dismiss',
}));

vi.mock('@/app/hooks/lawyerDashboard/globalSearch/globalSearchShellExit', () => ({
    beginGlobalSearchShellExit: (onDone: () => void) => onDone(),
    clearGlobalSearchShellClosing: vi.fn(),
    GLOBAL_SEARCH_LAYER_EXIT_MS: 200,
}));

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: () => true,
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

vi.mock('@/app/runtime/globalSearchLoader', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/runtime/globalSearchLoader')>();
    return {
        ...actual,
        loadGlobalSearchOverlayModule: vi.fn(() =>
            Promise.resolve({ GlobalSearchOverlay: () => null } as typeof import('@/app/components/lawyer/GlobalSearchOverlay')),
        ),
    };
});

describe('useLawyerDashboardGlobalSearch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        try {
            sessionStorage.removeItem(LAWYER_GLOBAL_SEARCH_OPEN_KEY);
        } catch {
            /* ignore */
        }
    });

    it('لا يفتح البحث تلقائياً', () => {
        const { result } = renderHook(() => useLawyerDashboardGlobalSearch({ userId: 'lawyer-1' }));
        expect(result.current.showGlobalSearch).toBe(false);
    });

    it('لا يستعيد البحث من sessionStorage بعد reload', () => {
        sessionStorage.setItem(LAWYER_GLOBAL_SEARCH_OPEN_KEY, '1');
        const { result } = renderHook(() => useLawyerDashboardGlobalSearch({ userId: 'lawyer-1' }));
        expect(result.current.showGlobalSearch).toBe(false);
        expect(result.current.searchHostMounted).toBe(false);
        expect(sessionStorage.getItem(LAWYER_GLOBAL_SEARCH_OPEN_KEY)).toBeNull();
    });

    it('primeGlobalSearchShellMount يسخّن بلا فتح ولا تركيب Host', () => {
        const { result } = renderHook(() => useLawyerDashboardGlobalSearch({ userId: 'lawyer-1' }));
        act(() => {
            result.current.primeGlobalSearchShellMount();
        });
        expect(result.current.showGlobalSearch).toBe(false);
        expect(result.current.searchHostMounted).toBe(false);
    });

    it('يفتح البحث للمستخدم المسجّل فوراً (طلاء ثم setState)', async () => {
        const { result } = renderHook(() => useLawyerDashboardGlobalSearch({ userId: 'lawyer-1' }));

        await act(async () => {
            result.current.openGlobalSearch('جلسة');
            await new Promise<void>((resolve) => {
                requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
            });
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(result.current.showGlobalSearch).toBe(true);
        expect(result.current.searchHostMounted).toBe(true);
        expect(result.current.globalSearchInitialQuery).toBe('جلسة');
        expect(warmGlobalSearchOnOpen).toHaveBeenCalled();
    });

    it('يرفض فتح البحث بدون تسجيل دخول ويزيل طلاء الجسر', () => {
        const { result } = renderHook(() => useLawyerDashboardGlobalSearch({ userId: null }));

        act(() => {
            result.current.openGlobalSearch();
        });

        expect(result.current.showGlobalSearch).toBe(false);
        expect(concealGlobalSearchWarmShell).toHaveBeenCalled();
        expect(SmartToast.error).toHaveBeenCalled();
    });

    it('يسمح بفتح البحث للضيف المحلي', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardGlobalSearch({ userId: GUEST_LAWYER_ID }),
        );

        act(() => {
            result.current.openGlobalSearch();
        });

        expect(result.current.showGlobalSearch).toBe(true);
        expect(result.current.searchHostMounted).toBe(true);
    });

    it('closeGlobalSearch يُصفّر الاستعلام ويزيد session key ويفك Host', async () => {
        const { result } = renderHook(() => useLawyerDashboardGlobalSearch({ userId: 'lawyer-1' }));

        await act(async () => {
            result.current.openGlobalSearch('استعلام قديم');
            await Promise.resolve();
        });

        expect(result.current.showGlobalSearch).toBe(true);
        const sessionBefore = result.current.globalSearchSessionKey;

        act(() => {
            result.current.closeGlobalSearch();
        });

        expect(result.current.showGlobalSearch).toBe(false);
        expect(result.current.searchHostMounted).toBe(false);
        expect(result.current.globalSearchInitialQuery).toBe('');
        expect(result.current.globalSearchSessionKey).toBe(sessionBefore + 1);
    });

    it('يغلق عند dismiss-transient-overlays', async () => {
        const { result } = renderHook(() => useLawyerDashboardGlobalSearch({ userId: 'lawyer-1' }));

        await act(async () => {
            result.current.openGlobalSearch();
            await Promise.resolve();
        });

        expect(result.current.showGlobalSearch).toBe(true);

        act(() => {
            window.dispatchEvent(new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: { except: 'forum' } }));
        });

        expect(result.current.showGlobalSearch).toBe(false);
        expect(result.current.searchHostMounted).toBe(false);
        expect(result.current.globalSearchInitialQuery).toBe('');
    });

    it('يتجاهل النقر المتكرر أثناء الفتح أو عند كون البحث مفتوحاً', async () => {
        const { result } = renderHook(() => useLawyerDashboardGlobalSearch({ userId: 'lawyer-1' }));

        await act(async () => {
            result.current.openGlobalSearch();
            result.current.openGlobalSearch();
            result.current.openGlobalSearch();
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(warmGlobalSearchOnOpen).toHaveBeenCalledTimes(1);
        expect(result.current.showGlobalSearch).toBe(true);
    });

    it('يزيد searchIndexVersion عند bumpSearchIndex', () => {
        const { result } = renderHook(() => useLawyerDashboardGlobalSearch({ userId: 'lawyer-1' }));

        act(() => {
            result.current.bumpSearchIndex();
        });

        expect(result.current.searchIndexVersion).toBe(1);
    });

    it('يغلق عند حدث إغلاق جسر الطلاء', async () => {
        const { result } = renderHook(() => useLawyerDashboardGlobalSearch({ userId: 'lawyer-1' }));

        await act(async () => {
            result.current.openGlobalSearch();
            await Promise.resolve();
        });
        expect(result.current.showGlobalSearch).toBe(true);

        act(() => {
            window.dispatchEvent(new CustomEvent('hami-gs-instant-dismiss'));
        });

        expect(result.current.showGlobalSearch).toBe(false);
        expect(result.current.searchHostMounted).toBe(false);
    });
});
