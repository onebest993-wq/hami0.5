import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLawyerDashboardNotifications } from '../lawyerDashboard/useLawyerDashboardNotifications';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: vi.fn(),
        info: vi.fn(),
        success: vi.fn(),
    },
}));

vi.mock('@/app/stores/notificationStore', () => ({
    useNotificationStore: (selector: (s: { notifications: []; unreadCount: number }) => unknown) =>
        selector({ notifications: [], unreadCount: 2 }),
}));

vi.mock('@/app/hooks/useIncomingCaseShares', () => ({
    useIncomingCaseShares: () => ({ pendingCount: 1 }),
}));

describe('useLawyerDashboardNotifications', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يفتح لوحة الإشعارات للمستخدم المسجّل', () => {
        const { result } = renderHook(() => useLawyerDashboardNotifications('lawyer-1'));

        act(() => {
            result.current.openNotifications();
        });

        expect(result.current.showNotifications).toBe(true);
        expect(result.current.notificationPanelMounted).toBe(true);
        expect(result.current.notificationsUnreadCount).toBe(3);
    });

    it('يرفض فتح الإشعارات بدون تسجيل دخول', () => {
        const { result } = renderHook(() => useLawyerDashboardNotifications(null));

        act(() => {
            result.current.openNotifications();
        });

        expect(result.current.showNotifications).toBe(false);
        expect(result.current.notificationPanelMounted).toBe(false);
    });
});
