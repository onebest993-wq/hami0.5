import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLawyerDashboardScheduleTab } from '@/app/hooks/lawyerDashboard/useLawyerDashboardScheduleTab';
import { markShellHandoffPending, resetShellHandoffPendingForTests } from '@/app/runtime/sectionShellHandoff';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: vi.fn(),
        info: vi.fn(),
        success: vi.fn(),
    },
}));

vi.mock('@/app/runtime/scheduleBootHydrator', () => ({
    hydrateScheduleShellForInstantOpenWithData: vi.fn(() => Promise.resolve(true)),
    prefetchScheduleAfterBootReveal: vi.fn(),
    bindScheduleBootHydrator: vi.fn(() => () => undefined),
}));

vi.mock('@/app/runtime/scheduleHubLoader', () => ({
    prefetchScheduleTabHostModule: vi.fn(),
    prefetchScheduleHubModule: vi.fn(),
    loadScheduleTabHostModule: () => Promise.resolve({}),
    loadScheduleHubModule: () => Promise.resolve([]),
}));

vi.mock('@/app/hooks/lawyerDashboard/scheduleIntentWarm', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/hooks/lawyerDashboard/scheduleIntentWarm')>();
    return {
        ...actual,
        warmCalendarEventsCache: vi.fn(() => Promise.resolve([])),
        warmScheduleOnHover: vi.fn(),
        warmScheduleOnOpen: vi.fn(),
        registerScheduleWarmUserId: vi.fn(() => () => undefined),
    };
});

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: vi.fn(() => () => undefined),
}));

vi.mock('@/app/bootstrap/bootReveal', () => ({
    BOOT_REVEAL_DONE_EVENT: 'hami:boot-reveal-done',
    isBootRevealDone: () => false,
    onBootContentReady: () => () => undefined,
}));

vi.mock('@/app/services/schedule/scheduleShellSnap', () => ({
    snapScheduleShellOpen: vi.fn(),
    snapScheduleShellClose: vi.fn(),
    isScheduleShellSnappedOpen: vi.fn(() => false),
    scheduleShellReactSync: (fn: () => void) => fn(),
}));

describe('useLawyerDashboardScheduleTab', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        resetShellHandoffPendingForTests();
    });

    it('لا يغلق ستارة التقويم فوراً عند تركيب الـ hook والتبويب الرئيسية (handoff)', async () => {
        const snap = await import('@/app/services/schedule/scheduleShellSnap');
        vi.mocked(snap.isScheduleShellSnappedOpen).mockReturnValue(true);

        renderHook(() =>
            useLawyerDashboardScheduleTab({
                userId: 'lawyer-1',
                activeTab: 'home',
                setActiveTab: vi.fn(),
            }),
        );

        expect(snap.snapScheduleShellClose).not.toHaveBeenCalled();

        await act(async () => {
            await Promise.resolve();
        });
        /* بعد macrotask بدون فتح حقيقي يُغلق اليتيم */
        await act(async () => {
            await new Promise<void>((r) => setTimeout(r, 0));
        });
        expect(snap.snapScheduleShellClose).toHaveBeenCalled();
    });

    it('لا يغلق ستارة التقويم أثناء تسليم stub→live المعلّق', async () => {
        const snap = await import('@/app/services/schedule/scheduleShellSnap');
        vi.mocked(snap.isScheduleShellSnappedOpen).mockReturnValue(true);
        markShellHandoffPending('schedule');

        renderHook(() =>
            useLawyerDashboardScheduleTab({
                userId: 'lawyer-1',
                activeTab: 'home',
                setActiveTab: vi.fn(),
            }),
        );

        await act(async () => {
            await new Promise<void>((r) => setTimeout(r, 0));
        });
        expect(snap.snapScheduleShellClose).not.toHaveBeenCalled();
    });

    it('لا يركّب Host التقويم عند الإقلاع على تبويب الرئيسية بلا هوية', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardScheduleTab({
                userId: null,
                activeTab: 'home',
                setActiveTab: vi.fn(),
            }),
        );
        expect(result.current.scheduleHostMounted).toBe(false);
    });

    it('لا يركّب Host التقويم فور الهوية — حتى فتح التبويب', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardScheduleTab({
                userId: 'lawyer-1',
                activeTab: 'home',
                setActiveTab: vi.fn(),
            }),
        );
        expect(result.current.scheduleHostMounted).toBe(false);
    });

    it('لمسة prime لا تركّب Host التقويم', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardScheduleTab({
                userId: 'lawyer-1',
                activeTab: 'home',
                setActiveTab: vi.fn(),
            }),
        );

        act(() => {
            result.current.primeScheduleTabMount();
        });
        expect(result.current.scheduleHostMounted).toBe(false);
    });

    it('يزيد sessionKey عند دخول تبويب الجدول', () => {
        const setActiveTab = vi.fn();
        const { result, rerender } = renderHook(
            ({ activeTab }) => useLawyerDashboardScheduleTab({ userId: 'lawyer-1', activeTab, setActiveTab }),
            { initialProps: { activeTab: 'home' as const } },
        );

        expect(result.current.scheduleTabSessionKey).toBe(0);

        rerender({ activeTab: 'schedule' });

        expect(result.current.scheduleTabSessionKey).toBeGreaterThan(0);
    });

    it('يفتح الجدول مع تركيز بحث اختياري', async () => {
        const setActiveTab = vi.fn();
        const { result } = renderHook(() =>
            useLawyerDashboardScheduleTab({ userId: 'lawyer-1', activeTab: 'home', setActiveTab }),
        );

        act(() => {
            result.current.openScheduleTab({ date: '2026-06-01', eventId: 'ev-1' });
        });

        await vi.waitFor(() => {
            expect(setActiveTab).toHaveBeenCalledWith('schedule');
            expect(result.current.scheduleHostMounted).toBe(true);
            expect(result.current.calendarSearchFocus).toEqual({
                date: '2026-06-01',
                eventId: 'ev-1',
            });
        });
    });

    it('يرفض الفتح بدون تسجيل دخول', () => {
        const setActiveTab = vi.fn();
        const { result } = renderHook(() =>
            useLawyerDashboardScheduleTab({ userId: null, activeTab: 'home', setActiveTab }),
        );

        act(() => {
            result.current.openScheduleTab();
        });

        expect(setActiveTab).not.toHaveBeenCalled();
    });

    it('لا يعيد remount عند العودة للتقويم — sessionKey ثابت', async () => {
        const setActiveTab = vi.fn();
        const { result, rerender } = renderHook(
            ({ activeTab }) =>
                useLawyerDashboardScheduleTab({ userId: 'lawyer-1', activeTab, setActiveTab }),
            { initialProps: { activeTab: 'home' as const } },
        );

        act(() => {
            result.current.openScheduleTab();
        });
        await vi.waitFor(() => {
            expect(setActiveTab).toHaveBeenCalledWith('schedule');
        });
        rerender({ activeTab: 'schedule' });
        const sessionKey = result.current.scheduleTabSessionKey;
        expect(sessionKey).toBeGreaterThan(0);

        act(() => {
            result.current.backToHomeFromSchedule();
        });
        rerender({ activeTab: 'home' });

        act(() => {
            result.current.openScheduleTab();
        });
        await vi.waitFor(() => {
            expect(setActiveTab).toHaveBeenLastCalledWith('schedule');
        });
        rerender({ activeTab: 'schedule' });

        expect(result.current.scheduleTabSessionKey).toBe(sessionKey);
    });

    it('الرجوع للرئيسية يمسح تركيز البحث', () => {
        const setActiveTab = vi.fn();
        const { result } = renderHook(() =>
            useLawyerDashboardScheduleTab({ userId: 'lawyer-1', activeTab: 'schedule', setActiveTab }),
        );

        act(() => {
            result.current.setCalendarSearchFocus({ date: '2026-06-01' });
        });

        act(() => {
            result.current.backToHomeFromSchedule();
        });

        expect(result.current.calendarSearchFocus).toBeNull();
        expect(setActiveTab).toHaveBeenCalledWith('home');
    });

    it('يمسح host ويعود للرئيسية عند غياب الهوية', () => {
        const setActiveTab = vi.fn();
        const { result, rerender } = renderHook(
            ({ userId }: { userId: string | null }) =>
                useLawyerDashboardScheduleTab({ userId, activeTab: 'schedule', setActiveTab }),
            { initialProps: { userId: 'lawyer-1' as string | null } },
        );

        expect(result.current.scheduleHostMounted).toBe(true);

        rerender({ userId: null });

        expect(result.current.scheduleHostMounted).toBe(false);
        expect(setActiveTab).toHaveBeenCalledWith('home');
        expect(result.current.calendarSearchFocus).toBeNull();
    });
});
