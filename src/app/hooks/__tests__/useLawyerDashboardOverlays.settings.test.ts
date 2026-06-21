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

describe('useLawyerDashboardOverlays — الإعدادات', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يفتح الإعدادات للمستخدم المسجّل', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardOverlays({ setArchiveType: vi.fn(), userId: 'lawyer-1' }),
        );

        act(() => {
            result.current.openSettings();
        });

        expect(result.current.showSettings).toBe(true);
    });

    it('يرفض فتح الإعدادات بدون تسجيل دخول', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardOverlays({ setArchiveType: vi.fn(), userId: null }),
        );

        act(() => {
            result.current.openSettings();
        });

        expect(result.current.showSettings).toBe(false);
    });
});
