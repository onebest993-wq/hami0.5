import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { useIncomingCaseShares } from '@/app/hooks/useIncomingCaseShares';
import { useNotificationBackgroundSync } from '@/app/hooks/lawyerDashboard/useNotificationBackgroundSync';
import {
    NOTIFICATIONS_SHELL_FEATURE,
    computeNotificationsShellUnreadCount,
    openNotificationsFromShell,
} from '@/app/services/notifications/notificationShellNavigation';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import {
    clearNotificationPerfMarks,
    markNotificationPerfPhase,
} from '@/app/services/notifications/notificationPerfMetrics';
import { loadNotificationPanelModule } from '@/app/runtime/notificationPanelLoader';
import {
    dismissTransientOverlays,
} from '@/app/utils/bodyScrollLock';
import { registerDashboardOverlayCloser } from '@/app/hooks/lawyerDashboard/dashboardOverlayCoordinator';
import {
    warmNotificationsOnHover,
    warmNotificationsOnOpen,
} from '@/app/hooks/lawyerDashboard/notificationIntentWarm';
import { hydrateNotificationShellForInstantOpen } from '@/app/runtime/notificationBootHydrator';

export function useLawyerDashboardNotifications(userId: string | null) {
    const notifications = useNotificationStore((s) => s.notifications);
    const storeUnreadCount = useNotificationStore((s) => s.unreadCount);
    const { pendingCount: caseSharePendingCount } = useIncomingCaseShares(userId, Boolean(userId), {
        pollIntervalMs: null,
        deferInitialFetch: true,
    });
    const notificationsUnreadCount = computeNotificationsShellUnreadCount(
        storeUnreadCount,
        caseSharePendingCount,
    );
    const [showNotifications, setShowNotifications] = useState(false);
    const [notificationPanelSessionKey, setNotificationPanelSessionKey] = useState(0);
    const showNotificationsRef = useRef(false);
    const openInFlightRef = useRef(false);
    showNotificationsRef.current = showNotifications;

    useNotificationBackgroundSync(userId, {
        panelOpen: showNotifications,
        enabled: Boolean(userId),
        deferUntilBootIdle: true,
    });

    const closeNotifications = useCallback(() => {
        showNotificationsRef.current = false;
        setShowNotifications(false);
        setNotificationPanelSessionKey((k) => k + 1);
    }, []);

    const primeNotificationPanelMount = useCallback(() => {
        warmNotificationsOnHover();
        void hydrateNotificationShellForInstantOpen().catch(() => undefined);
    }, []);

    useEffect(() => {
        return registerDashboardOverlayCloser('notifications', () => {
            setShowNotifications(false);
        });
    }, []);

    const openNotifications = useCallback(() => {
        openNotificationsFromShell({
            signedIn: isRealSignedIn(userId),
            onSignedOut: () =>
                SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${NOTIFICATIONS_SHELL_FEATURE}`),
            onOpen: () => {
                if (showNotificationsRef.current || openInFlightRef.current) return;
                openInFlightRef.current = true;
                try {
                    clearNotificationPerfMarks();
                    markNotificationPerfPhase('open-request');
                    warmNotificationsOnOpen(userId);

                    flushSync(() => {
                        setShowNotifications(true);
                        showNotificationsRef.current = true;
                    });

                    queueMicrotask(() => dismissTransientOverlays('notifications'));

                    void loadNotificationPanelModule()
                        .catch(() => undefined)
                        .then(() => markNotificationPerfPhase('chunk-ready'));
                    void hydrateNotificationShellForInstantOpen(true).catch(() => undefined);
                } finally {
                    openInFlightRef.current = false;
                }
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

    useEffect(() => {
        if (!import.meta.env.DEV || typeof window === 'undefined') return;
        const w = window as Window & {
            __hamiE2eForceOpenNotifications?: () => void;
            __hamiE2eNotificationDebug?: () => { showNotifications: boolean };
        };
        w.__hamiE2eForceOpenNotifications = () => openNotifications();
        w.__hamiE2eNotificationDebug = () => ({
            showNotifications,
        });
        return () => {
            delete w.__hamiE2eForceOpenNotifications;
            delete w.__hamiE2eNotificationDebug;
        };
    }, [openNotifications, showNotifications]);

    return {
        showNotifications,
        setShowNotifications,
        closeNotifications,
        notificationPanelSessionKey,
        openNotifications,
        searchNotifications,
        notificationsUnreadCount,
        caseSharePendingCount,
        primeNotificationPanelMount,
    };
}
