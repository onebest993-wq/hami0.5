import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLawyerDashboardProfileTab } from '@/app/hooks/lawyerDashboard/useLawyerDashboardProfileTab';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: vi.fn(),
        info: vi.fn(),
        success: vi.fn(),
    },
}));

vi.mock('@/app/runtime/lawyerDashboardProfileTabLoader', () => ({
    prefetchLawyerDashboardProfileTabShell: vi.fn(),
}));

vi.mock('@/app/runtime/royalLawyerProfileLoader', () => ({
    loadRoyalLawyerProfileModule: vi.fn(() => Promise.resolve()),
    prefetchRoyalLawyerProfile: vi.fn(),
    prefetchRoyalLawyerProfileChunk: vi.fn(),
}));

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: vi.fn(() => () => undefined),
}));

describe('useLawyerDashboardProfileTab — shell navigation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يفتح تبويب الملف للمستخدم المسجّل', async () => {
        const setActiveTab = vi.fn();
        const { result } = renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: 'lawyer-1',
                activeTab: 'home',
                setActiveTab,
                setShowCommunity: vi.fn(),
            }),
        );

        act(() => {
            result.current.openProfileTab();
        });

        await waitFor(() => expect(setActiveTab).toHaveBeenCalledWith('profile'));
    });

    it('يرفض فتح الملف بدون تسجيل دخول', () => {
        const setActiveTab = vi.fn();
        const { result } = renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: null,
                activeTab: 'home',
                setActiveTab,
                setShowCommunity: vi.fn(),
            }),
        );

        act(() => {
            result.current.openProfileTab();
        });

        expect(setActiveTab).not.toHaveBeenCalled();
    });
});
