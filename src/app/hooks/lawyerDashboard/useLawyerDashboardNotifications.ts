import { useCallback, useMemo, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { useIncomingCaseShares } from '@/app/hooks/useIncomingCaseShares';
import {
    NOTIFICATIONS_SHELL_FEATURE,
    computeNotificationsShellUnreadCount,
    openNotificationsFromShell,
} from '@/app/services/notifications/notificationShellNavigation';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import { prefetchNotificationPanel } from '@/app/utils/lazyComponents';

export function useLawyerDashboardNotifications(userId: string | null) {
    const notifications = useNotificationStore((s) => s.notifications);
    const storeUnreadCount = useNotificationStore((s) => s.unreadCount);
    const { pendingCount: caseSharePendingCount } = useIncomingCaseShares(userId, Boolean(userId));
    const notificationsUnreadCount = computeNotificationsShellUnreadCount(
        storeUnreadCount,
        caseSharePendingCount,
    );
    const [showNotifications, setShowNotifications] = useState(false);
    const [notificationPanelMounted, setNotificationPanelMounted] = useState(false);

    const openNotifications = useCallback(() => {
        openNotificationsFromShell({
            signedIn: isRealSignedIn(userId),
            onSignedOut: () =>
                SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${NOTIFICATIONS_SHELL_FEATURE}`),
            onOpen: () => {
                dismissTransientOverlays();
                prefetchNotificationPanel();
                setNotificationPanelMounted(true);
                setShowNotifications(true);
            },
        });
    }, [userId]);

    const searchNotifications = useMemo(
        () =>
            notifications.map((n) => ({
                id: n.id,
                title: n.title,
                message: n.message,
                type: n.type,
            })),
        [notifications],
    );

    return {
        showNotifications,
        setShowNotifications,
        notificationPanelMounted,
        openNotifications,
        searchNotifications,
        notificationsUnreadCount,
        caseSharePendingCount,
    };
}
