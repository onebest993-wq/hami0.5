import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLawyerDashboardHomeTab } from '@/app/hooks/lawyerDashboard/useLawyerDashboardHomeTab';

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

    it('يسجّل open-request عند العودة للرئيسية', () => {
        const { rerender } = renderHook(
            ({ activeTab }) => useLawyerDashboardHomeTab({ activeTab }),
            { initialProps: { activeTab: 'schedule' as const } },
        );

        vi.mocked(clearHomeHubPerfMarks).mockClear();
        vi.mocked(markHomeHubPerfPhase).mockClear();

        rerender({ activeTab: 'home' });

        expect(clearHomeHubPerfMarks).not.toHaveBeenCalled();
        expect(markHomeHubPerfPhase).toHaveBeenCalledWith('open-request');
    });

    it('لا يمسح علامات الأداء عند مغادرة الرئيسية — ثبات الكارت', () => {
        const { rerender } = renderHook(
            ({ activeTab }) => useLawyerDashboardHomeTab({ activeTab }),
            { initialProps: { activeTab: 'home' as const } },
        );

        vi.mocked(clearHomeHubPerfMarks).mockClear();

        rerender({ activeTab: 'schedule' });

        expect(clearHomeHubPerfMarks).not.toHaveBeenCalled();
    });
});
