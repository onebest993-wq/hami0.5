import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLawyerDashboardHomeTab } from '@/app/hooks/lawyerDashboard/useLawyerDashboardHomeTab';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';

vi.mock('@/app/runtime/homeHubCardLoader', () => ({
    prefetchLawyerHomeHubCardModule: vi.fn(() => Promise.resolve()),
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

    it('يصفّر جلسة القياس ثم يسجّل open-request عند العودة للرئيسية', () => {
        const { rerender } = renderHook(
            ({ activeTab }) => useLawyerDashboardHomeTab({ activeTab }),
            { initialProps: { activeTab: 'schedule' as LawyerDashboardTab } },
        );

        vi.mocked(clearHomeHubPerfMarks).mockClear();
        vi.mocked(markHomeHubPerfPhase).mockClear();

        rerender({ activeTab: 'home' });

        expect(clearHomeHubPerfMarks).toHaveBeenCalledTimes(1);
        expect(markHomeHubPerfPhase).toHaveBeenCalledWith('open-request');
    });

    it('لا يمسح علامات الأداء عند مغادرة الرئيسية — ثبات الكارت', () => {
        const { rerender } = renderHook(
            ({ activeTab }) => useLawyerDashboardHomeTab({ activeTab }),
            { initialProps: { activeTab: 'home' as LawyerDashboardTab } },
        );

        vi.mocked(clearHomeHubPerfMarks).mockClear();

        rerender({ activeTab: 'schedule' });

        expect(clearHomeHubPerfMarks).not.toHaveBeenCalled();
    });

    it('يعيد تصفير القياس عند كل دخول جديد إلى الرئيسية', () => {
        const { rerender } = renderHook(
            ({ activeTab }) => useLawyerDashboardHomeTab({ activeTab }),
            { initialProps: { activeTab: 'home' as LawyerDashboardTab } },
        );

        vi.mocked(clearHomeHubPerfMarks).mockClear();
        vi.mocked(markHomeHubPerfPhase).mockClear();

        rerender({ activeTab: 'schedule' });
        rerender({ activeTab: 'home' });

        expect(clearHomeHubPerfMarks).toHaveBeenCalledTimes(1);
        expect(markHomeHubPerfPhase).toHaveBeenCalledTimes(1);
        expect(markHomeHubPerfPhase).toHaveBeenCalledWith('open-request');
    });
});
