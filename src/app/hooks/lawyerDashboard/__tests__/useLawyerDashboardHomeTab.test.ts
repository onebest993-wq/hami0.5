import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLawyerDashboardHomeTab } from '@/app/hooks/lawyerDashboard/useLawyerDashboardHomeTab';
import { HAMI_DISMISS_OVERLAYS_EVENT } from '@/app/utils/bodyScrollLock';

vi.mock('@/app/runtime/homeHubLoader', () => ({
    prefetchLawyerHomeTabModule: vi.fn(),
    loadLawyerHomeTabModule: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@/app/services/alerts/homeHubPerfMetrics', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/alerts/homeHubPerfMetrics')>();
    return {
        ...actual,
        clearHomeHubPerfMarks: vi.fn(),
        markHomeHubPerfPhase: vi.fn(),
    };
});

import {
    clearHomeHubPerfMarks,
    markHomeHubPerfPhase,
} from '@/app/services/alerts/homeHubPerfMetrics';

describe('useLawyerDashboardHomeTab', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يسجّل open-request عند العودة للرئيسية', () => {
        const setActiveTab = vi.fn();
        const { rerender } = renderHook(
            ({ activeTab }) => useLawyerDashboardHomeTab({ activeTab, setActiveTab }),
            { initialProps: { activeTab: 'schedule' as const } },
        );

        vi.mocked(clearHomeHubPerfMarks).mockClear();
        vi.mocked(markHomeHubPerfPhase).mockClear();

        rerender({ activeTab: 'home' });

        expect(clearHomeHubPerfMarks).not.toHaveBeenCalled();
        expect(markHomeHubPerfPhase).toHaveBeenCalledWith('open-request');
    });

    it('يمسح علامات الأداء عند مغادرة الرئيسية', () => {
        const setActiveTab = vi.fn();
        const { rerender } = renderHook(
            ({ activeTab }) => useLawyerDashboardHomeTab({ activeTab, setActiveTab }),
            { initialProps: { activeTab: 'home' as const } },
        );

        vi.mocked(clearHomeHubPerfMarks).mockClear();

        rerender({ activeTab: 'schedule' });

        expect(clearHomeHubPerfMarks).toHaveBeenCalledTimes(1);
    });

    it('يفتح وضع التخصيص ويغلقه', () => {
        const setActiveTab = vi.fn();
        const { result } = renderHook(() =>
            useLawyerDashboardHomeTab({ activeTab: 'home', setActiveTab }),
        );

        act(() => {
            result.current.enterHomeLayoutEdit();
        });

        expect(setActiveTab).toHaveBeenCalledWith('home');
        expect(result.current.homeLayoutEditMode).toBe(true);

        act(() => {
            result.current.exitHomeLayoutEdit();
        });

        expect(result.current.homeLayoutEditMode).toBe(false);
    });

    it('يغلق وضع التخصيص عند dismiss-transient-overlays', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardHomeTab({ activeTab: 'home', setActiveTab: vi.fn() }),
        );

        act(() => {
            result.current.enterHomeLayoutEdit();
        });

        act(() => {
            window.dispatchEvent(new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: { except: 'vault' } }));
        });

        expect(result.current.homeLayoutEditMode).toBe(false);
    });
});
