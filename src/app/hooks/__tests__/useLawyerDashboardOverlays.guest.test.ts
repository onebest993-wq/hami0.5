import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';
import { useLawyerDashboardOverlays } from '../useLawyerDashboardOverlays';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: vi.fn(),
        info: vi.fn(),
        success: vi.fn(),
    },
}));

describe('useLawyerDashboardOverlays — الضيف التجريبي', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يرفض فتح البحث للضيف guest-lawyer-1', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardOverlays({ setArchiveType: vi.fn(), userId: GUEST_LAWYER_ID }),
        );

        act(() => {
            result.current.openGlobalSearch();
        });

        expect(result.current.showGlobalSearch).toBe(false);
    });

    it('يفتح البحث للمستخدم الحقيقي', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardOverlays({
                setArchiveType: vi.fn(),
                userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            }),
        );

        act(() => {
            result.current.openGlobalSearch();
        });

        expect(result.current.showGlobalSearch).toBe(true);
    });
});
