import { describe, expect, it, vi, beforeEach } from 'vitest';

import { renderHook, act } from '@testing-library/react';

import { useLawyerDashboardNotifications } from '../lawyerDashboard/useLawyerDashboardNotifications';

import { HAMI_DISMISS_OVERLAYS_EVENT } from '@/app/utils/bodyScrollLock';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: vi.fn(),
        info: vi.fn(),
        success: vi.fn(),
    },
}));

vi.mock('@/app/stores/notificationStore', () => {
    const fetchNotifications = vi.fn();
    const state = { notifications: [] as [], unreadCount: 2, fetchNotifications };
    const useNotificationStore = (selector: (s: typeof state) => unknown) => selector(state);
    useNotificationStore.getState = () => state;
    return { useNotificationStore };
});

vi.mock('@/app/hooks/useIncomingCaseShares', () => ({
    useIncomingCaseShares: () => ({ pendingCount: 1 }),
}));

vi.mock('@/app/hooks/useForumNotificationStream', () => ({
    useForumNotificationStream: vi.fn(),
}));

vi.mock('@/app/hooks/lawyerDashboard/useNotificationBackgroundSync', () => ({
    useNotificationBackgroundSync: vi.fn(),
}));

vi.mock('@/app/hooks/lawyerDashboard/notificationIntentWarm', () => ({
    warmNotificationsOnHover: vi.fn(),
    warmNotificationsOnOpen: vi.fn(),
}));

import { warmNotificationsOnOpen } from '@/app/hooks/lawyerDashboard/notificationIntentWarm';

vi.mock('@/app/runtime/notificationPanelLoader', () => ({
    loadNotificationPanelModule: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: (fn: () => void) => {
        fn();
        return () => undefined;
    },
}));

describe('useLawyerDashboardNotifications', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('لا يفتح اللوحة تلقائياً', () => {
        const { result } = renderHook(() => useLawyerDashboardNotifications('lawyer-1'));
        expect(result.current.showNotifications).toBe(false);
    });

    it('primeNotificationPanelMount ي prefetch فقط — بلا فتح', () => {
        const { result } = renderHook(() => useLawyerDashboardNotifications('lawyer-1'));

        act(() => {
            result.current.primeNotificationPanelMount();
        });

        expect(result.current.showNotifications).toBe(false);
    });

    it('يفتح لوحة الإشعارات للمستخدم المسجّل', async () => {
        const { result } = renderHook(() => useLawyerDashboardNotifications('lawyer-1'));

        await act(async () => {
            result.current.openNotifications();
            await Promise.resolve();
        });

        expect(result.current.showNotifications).toBe(true);
        expect(result.current.notificationPanelSessionKey).toBe(0);
        expect(result.current.notificationsUnreadCount).toBe(3);
    });

    it('يرفض فتح الإشعارات بدون تسجيل دخول', () => {
        const { result } = renderHook(() => useLawyerDashboardNotifications(null));

        act(() => {
            result.current.openNotifications();
        });

        expect(result.current.showNotifications).toBe(false);
    });

    it('closeNotifications يغلق اللوحة ويزيد session key', async () => {
        const { result } = renderHook(() => useLawyerDashboardNotifications('lawyer-1'));

        await act(async () => {
            result.current.openNotifications();
            await Promise.resolve();
        });
        act(() => {
            result.current.closeNotifications();
        });

        expect(result.current.showNotifications).toBe(false);
        expect(result.current.notificationPanelSessionKey).toBe(1);
    });

    it('يتجاهل النقر المتكرر أثناء الفتح أو عند كون اللوحة مفتوحة', async () => {
        const { result } = renderHook(() => useLawyerDashboardNotifications('lawyer-1'));

        await act(async () => {
            result.current.openNotifications();
            result.current.openNotifications();
            result.current.openNotifications();
            await Promise.resolve();
        });

        expect(warmNotificationsOnOpen).toHaveBeenCalledTimes(1);
        expect(result.current.showNotifications).toBe(true);
    });

    it('يغلق اللوحة عند dismiss-transient-overlays', async () => {
        const { result } = renderHook(() => useLawyerDashboardNotifications('lawyer-1'));

        await act(async () => {
            result.current.openNotifications();
            await Promise.resolve();
        });

        act(() => {
            window.dispatchEvent(new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: { except: 'vault' } }));
        });

        expect(result.current.showNotifications).toBe(false);
    });
});
