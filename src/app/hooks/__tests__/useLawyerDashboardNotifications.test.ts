import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { renderHook, act, waitFor } from '@testing-library/react';

import { useLawyerDashboardNotifications } from '../lawyerDashboard/useLawyerDashboardNotifications';

import { HAMI_DISMISS_OVERLAYS_EVENT } from '@/app/utils/bodyScrollLock';

const { tryPresentNativeNotificationSheet, isNativeNotificationSheetEnabled } = vi.hoisted(() => ({
    tryPresentNativeNotificationSheet: vi.fn(() => Promise.resolve(false)),
    isNativeNotificationSheetEnabled: vi.fn(() => false),
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: vi.fn(),
        info: vi.fn(),
        success: vi.fn(),
    },
}));

vi.mock('@/app/services/auth/shellAuth', () => ({
    hasLocalAppSession: (userId: string | null | undefined) => Boolean(userId?.trim()),
    isRealSignedIn: (userId: string | null | undefined) => Boolean(userId?.trim()),
    isShellAuthBypassed: () => false,
    resolveShellAuthUserId: (a?: string | null, b?: string | null) => a?.trim() || b?.trim() || null,
}));

vi.mock('@/app/infrastructure/notificationPeekLite', () => ({
    peekNotificationUnreadCount: () => 2,
    peekLocalNotifications: () => [],
}));

vi.mock('@/app/stores/notificationStore', () => {
    const fetchNotifications = vi.fn();
    const hydrateFromLocalPeek = vi.fn();
    const state = { notifications: [] as [], unreadCount: 2, fetchNotifications, hydrateFromLocalPeek };
    const useNotificationStore = (selector: (s: typeof state) => unknown) => selector(state);
    useNotificationStore.getState = () => state;
    useNotificationStore.subscribe = (fn: () => void) => {
        fn();
        return () => undefined;
    };
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
import { hydrateNotificationShellForInstantOpen } from '@/app/runtime/notificationBootHydrator';
import { resetNotificationReopenGuardForTests } from '@/app/services/notifications/notificationReopenGuard';
import { resetNotificationShellSnapForTests, snapNotificationShellClose } from '@/app/services/notifications/notificationShellSnap';
import { concealNotificationWarmPanel } from '@/app/runtime/notificationInstantPaint';

vi.mock('@/app/runtime/notificationBootHydrator', () => ({
    hydrateNotificationShellForInstantOpen: vi.fn(() => Promise.resolve(true)),
    bindNotificationBootHydrator: vi.fn(() => () => undefined),
    dispatchNotificationPrimeHost: vi.fn(),
}));

vi.mock('@/app/runtime/notificationPanelLoader', () => ({
    loadNotificationPanelModule: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: (fn: () => void) => {
        fn();
        return () => undefined;
    },
}));

vi.mock('@/app/runtime/nativeNotificationSheetBridge', () => ({
    isNativeNotificationSheetEnabled: () => isNativeNotificationSheetEnabled(),
    tryPresentNativeNotificationSheet: (...args: unknown[]) =>
        tryPresentNativeNotificationSheet(...args),
    installNativeNotificationSheetBridge: () => () => undefined,
}));

describe('useLawyerDashboardNotifications', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isNativeNotificationSheetEnabled.mockReturnValue(false);
        tryPresentNativeNotificationSheet.mockResolvedValue(false);
        resetNotificationReopenGuardForTests();
        resetNotificationShellSnapForTests();
        try {
            sessionStorage.removeItem('hami:lawyer-notifications-open');
        } catch {
            /* ignore */
        }
    });

    afterEach(() => {
        resetNotificationReopenGuardForTests();
        concealNotificationWarmPanel();
        vi.unstubAllEnvs();
    });

    it('لا يفتح اللوحة تلقائياً', () => {
        const { result } = renderHook(() => useLawyerDashboardNotifications('lawyer-1'));
        expect(result.current.showNotifications).toBe(false);
    });

    it('لا يسخّن لوحة الإشعارات على mount الأول', () => {
        renderHook(() => useLawyerDashboardNotifications('lawyer-1'));
        expect(hydrateNotificationShellForInstantOpen).not.toHaveBeenCalled();
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

        act(() => {
            result.current.openNotifications();
        });

        await waitFor(() => {
            expect(result.current.showNotifications).toBe(true);
        });
        expect(result.current.notificationsUnreadCount).toBe(3);
    });

    it('يرفض فتح الإشعارات بدون تسجيل دخول', () => {
        const { result } = renderHook(() => useLawyerDashboardNotifications(null));

        act(() => {
            result.current.openNotifications();
        });

        expect(result.current.showNotifications).toBe(false);
    });

    it('عند نجاح الورقة الأصلية لا يفتح الشلّ الويبي', async () => {
        vi.stubEnv('VITE_NATIVE_NOTIFICATION_SHEET', 'true');
        tryPresentNativeNotificationSheet.mockResolvedValue(true);
        const { result } = renderHook(() => useLawyerDashboardNotifications('lawyer-1'));

        act(() => {
            result.current.openNotifications();
        });

        await waitFor(() => {
            expect(tryPresentNativeNotificationSheet).toHaveBeenCalledWith('lawyer-1');
        });
        expect(result.current.showNotifications).toBe(false);
    });

    it('closeNotifications يغلق اللوحة', async () => {
        const { result } = renderHook(() => useLawyerDashboardNotifications('lawyer-1'));

        act(() => {
            result.current.openNotifications();
        });
        await waitFor(() => {
            expect(result.current.showNotifications).toBe(true);
        });
        act(() => {
            result.current.closeNotifications();
        });

        await waitFor(() => {
            expect(result.current.showNotifications).toBe(false);
        });
    });

    it('النقر الثاني على الجرس يُغلق اللوحة (toggle)', async () => {
        const { result } = renderHook(() => useLawyerDashboardNotifications('lawyer-1'));

        act(() => {
            result.current.openNotifications();
        });
        await waitFor(() => {
            expect(result.current.showNotifications).toBe(true);
        });
        act(() => {
            result.current.openNotifications();
        });

        await waitFor(() => {
            expect(result.current.showNotifications).toBe(false);
        });
    });

    it('يفتح مرة واحدة عند النقر الأول', async () => {
        const { result } = renderHook(() => useLawyerDashboardNotifications('lawyer-1'));

        act(() => {
            result.current.openNotifications();
        });

        await waitFor(() => {
            expect(result.current.showNotifications).toBe(true);
        });
        expect(warmNotificationsOnOpen).toHaveBeenCalledTimes(1);
    });

    it('يغلق اللوحة عند dismiss-transient-overlays', async () => {
        const { result } = renderHook(() => useLawyerDashboardNotifications('lawyer-1'));

        act(() => {
            result.current.openNotifications();
        });
        await waitFor(() => {
            expect(result.current.showNotifications).toBe(true);
        });

        act(() => {
            window.dispatchEvent(new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: { except: 'vault' } }));
        });

        await waitFor(() => {
            expect(result.current.showNotifications).toBe(false);
        });
    });

    it('يمسح React عندما يُغلق snap دون closeNotifications', async () => {
        const { result } = renderHook(() => useLawyerDashboardNotifications('lawyer-1'));

        act(() => {
            result.current.openNotifications();
        });
        await waitFor(() => {
            expect(result.current.showNotifications).toBe(true);
        });

        act(() => {
            snapNotificationShellClose();
        });

        await waitFor(() => {
            expect(result.current.showNotifications).toBe(false);
        });
    });
});
