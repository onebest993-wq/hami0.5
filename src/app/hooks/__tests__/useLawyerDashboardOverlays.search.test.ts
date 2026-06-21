import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLawyerDashboardOverlays } from '../useLawyerDashboardOverlays';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: vi.fn(),
        info: vi.fn(),
        success: vi.fn(),
    },
}));

describe('useLawyerDashboardOverlays — البحث الشامل', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يفتح البحث للمستخدم المسجّل', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardOverlays({ setArchiveType: vi.fn(), userId: 'lawyer-1' }),
        );

        act(() => {
            result.current.openGlobalSearch('جلسة');
        });

        expect(result.current.showGlobalSearch).toBe(true);
        expect(result.current.globalSearchInitialQuery).toBe('جلسة');
    });

    it('يرفض فتح البحث بدون تسجيل دخول', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardOverlays({ setArchiveType: vi.fn(), userId: null }),
        );

        act(() => {
            result.current.openGlobalSearch();
        });

        expect(result.current.showGlobalSearch).toBe(false);
    });
});
