import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLawyerDashboardScheduleTab } from '@/app/hooks/lawyerDashboard/useLawyerDashboardScheduleTab';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: vi.fn(),
        info: vi.fn(),
        success: vi.fn(),
    },
}));

vi.mock('@/app/runtime/scheduleHubLoader', () => ({
    loadScheduleHubModule: vi.fn(() => Promise.resolve([])),
    prefetchScheduleHubModule: vi.fn(),
}));

vi.mock('@/app/hooks/lawyerDashboard/scheduleIntentWarm', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/hooks/lawyerDashboard/scheduleIntentWarm')>();
    return {
        ...actual,
        warmCalendarEventsCache: vi.fn(() => Promise.resolve([])),
    };
});

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: vi.fn(() => () => undefined),
}));

describe('useLawyerDashboardScheduleTab', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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

        expect(setActiveTab).toHaveBeenCalledWith('schedule');
        expect(result.current.calendarSearchFocus).toEqual({ date: '2026-06-01', eventId: 'ev-1' });
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
        expect(setActiveTab).toHaveBeenCalledWith('schedule');
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
        expect(setActiveTab).toHaveBeenLastCalledWith('schedule');
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
});
