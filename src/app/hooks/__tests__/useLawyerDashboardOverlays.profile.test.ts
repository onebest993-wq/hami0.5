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

describe('useLawyerDashboardOverlays — الملف المهني', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يفتح تبويب الملف للمستخدم المسجّل', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardOverlays({ setArchiveType: vi.fn(), userId: 'lawyer-1' }),
        );

        act(() => {
            result.current.openProfileTab();
        });

        expect(result.current.activeTab).toBe('profile');
    });

    it('يرفض فتح الملف بدون تسجيل دخول', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardOverlays({ setArchiveType: vi.fn(), userId: null }),
        );

        const tabBefore = result.current.activeTab;

        act(() => {
            result.current.openProfileTab();
        });

        expect(result.current.activeTab).toBe(tabBefore);
    });
});
