import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';
import { useLawyerDashboardGlobalSearch } from '@/app/hooks/lawyerDashboard/useLawyerDashboardGlobalSearch';
import { HAMI_DISMISS_OVERLAYS_EVENT } from '@/app/utils/bodyScrollLock';
import { warmGlobalSearchOnOpen } from '@/app/hooks/lawyerDashboard/globalSearchIntentWarm';
import { loadGlobalSearchOverlayModule } from '@/app/runtime/globalSearchLoader';

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
    hydrateGlobalSearchShellForInstantOpen: vi.fn(() => Promise.resolve(true)),
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
    });

    it('لا يفتح البحث تلقائياً', () => {
        const { result } = renderHook(() => useLawyerDashboardGlobalSearch({ userId: 'lawyer-1' }));
        expect(result.current.showGlobalSearch).toBe(false);
    });

    it('primeGlobalSearchShellMount ي prefetch فقط — بلا فتح', () => {
        const { result } = renderHook(() => useLawyerDashboardGlobalSearch({ userId: 'lawyer-1' }));
        act(() => {
            result.current.primeGlobalSearchShellMount();
        });
        expect(result.current.showGlobalSearch).toBe(false);
    });

    it('يفتح البحث للمستخدم المسجّل فوراً (flushSync)', () => {
        const { result } = renderHook(() => useLawyerDashboardGlobalSearch({ userId: 'lawyer-1' }));

        act(() => {
            result.current.openGlobalSearch('جلسة');
        });

        expect(result.current.showGlobalSearch).toBe(true);
        expect(result.current.globalSearchInitialQuery).toBe('جلسة');
        expect(warmGlobalSearchOnOpen).toHaveBeenCalled();
        expect(loadGlobalSearchOverlayModule).toHaveBeenCalled();
    });

    it('يرفض فتح البحث بدون تسجيل دخول', () => {
        const { result } = renderHook(() => useLawyerDashboardGlobalSearch({ userId: null }));

        act(() => {
            result.current.openGlobalSearch();
        });

        expect(result.current.showGlobalSearch).toBe(false);
    });

    it('يرفض فتح البحث للضيف guest-lawyer-1', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardGlobalSearch({ userId: GUEST_LAWYER_ID }),
        );

        act(() => {
            result.current.openGlobalSearch();
        });

        expect(result.current.showGlobalSearch).toBe(false);
    });

    it('closeGlobalSearch يُصفّر الاستعلام ويزيد session key', async () => {
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
        expect(result.current.globalSearchInitialQuery).toBe('');
    });

    it('يتجاهل النقر المتكرر أثناء الفتح أو عند كون البحث مفتوحاً', async () => {
        const { result } = renderHook(() => useLawyerDashboardGlobalSearch({ userId: 'lawyer-1' }));

        await act(async () => {
            result.current.openGlobalSearch();
            result.current.openGlobalSearch();
            result.current.openGlobalSearch();
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
});
