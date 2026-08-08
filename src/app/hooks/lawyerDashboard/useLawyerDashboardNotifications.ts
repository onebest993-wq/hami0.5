import { useCallback, useEffect, useRef, useState } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { useIncomingCaseShares } from '@/app/hooks/useIncomingCaseShares';
import { useNotificationBackgroundSync } from '@/app/hooks/lawyerDashboard/useNotificationBackgroundSync';
import {
    NOTIFICATIONS_SHELL_FEATURE,
    computeNotificationsShellUnreadCount,
    openNotificationsFromShell,
} from '@/app/services/notifications/notificationShellNavigation';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import { registerDashboardOverlayCloser } from '@/app/hooks/lawyerDashboard/dashboardOverlayCoordinator';
import { executeOverlaySnapClose } from '@/app/runtime/overlaySnapClose';
import {
    clearNotificationForceVisible,
    concealNotificationWarmPanel,
} from '@/app/runtime/notificationInstantPaint';
import {
    persistNotificationsSessionOpen,
    readInitialNotificationsSession,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import { peekNotificationUnreadCount } from '@/app/infrastructure/notificationPeekLite';
import { commitNotificationShellOpen } from '@/app/hooks/lawyerDashboard/notifications/notificationShellOpenFlow';
import {
    primeNotificationHostMount,
    useNotificationHostLifecycle,
} from '@/app/hooks/lawyerDashboard/notifications/useNotificationHostLifecycle';
import {
    useNotificationStoreSync,
    type SearchNotificationRow,
} from '@/app/hooks/lawyerDashboard/notifications/useNotificationStoreSync';

export type { SearchNotificationRow };

export function useLawyerDashboardNotifications(
    userId: string | null,
    options?: { backgroundRuntimeEnabled?: boolean },
) {
    const backgroundRuntimeEnabled = options?.backgroundRuntimeEnabled !== false;
    const [storeUnreadCount, setStoreUnreadCount] = useState(() => peekNotificationUnreadCount(userId));
    const [searchNotifications, setSearchNotifications] = useState<SearchNotificationRow[]>([]);
    const { pendingCount: caseSharePendingCount } = useIncomingCaseShares(
        userId,
        Boolean(userId) && backgroundRuntimeEnabled,
        {
            pollIntervalMs: null,
            deferInitialFetch: true,
        },
    );
    const notificationsUnreadCount = computeNotificationsShellUnreadCount(
        storeUnreadCount,
        caseSharePendingCount,
    );
    const [initialSession] = useState(() => readInitialNotificationsSession());
    const [showNotifications, setShowNotifications] = useState(() => initialSession.open);
    const [notificationHostMounted, setNotificationHostMounted] = useState(() => initialSession.open);
    const [notificationPanelSessionKey, setNotificationPanelSessionKey] = useState(0);
    const showNotificationsRef = useRef(initialSession.open);
    const openInFlightRef = useRef(false);
    showNotificationsRef.current = showNotifications;

    useEffect(() => {
        setStoreUnreadCount(peekNotificationUnreadCount(userId));
    }, [userId]);

    useEffect(() => {
        if (isRealSignedIn(userId)) return;
        if (!showNotificationsRef.current && !initialSession.open) return;
        concealNotificationWarmPanel();
        clearNotificationForceVisible();
        showNotificationsRef.current = false;
        setShowNotifications(false);
        persistNotificationsSessionOpen(false);
    }, [userId, initialSession.open]);

    useNotificationStoreSync({
        showNotifications,
        initialSessionOpen: initialSession.open,
        setStoreUnreadCount,
        setSearchNotifications,
    });

    useNotificationBackgroundSync(userId, {
        panelOpen: showNotifications,
        enabled: Boolean(userId) && backgroundRuntimeEnabled,
        deferUntilBootIdle: true,
    });

    useNotificationHostLifecycle({
        userId,
        initialSessionOpen: initialSession.open,
        setNotificationHostMounted,
    });

    const closeNotifications = useCallback(() => {
        executeOverlaySnapClose({
            conceal: () => {
                concealNotificationWarmPanel();
                clearNotificationForceVisible();
            },
            commit: () => {
                showNotificationsRef.current = false;
                setShowNotifications(false);
                persistNotificationsSessionOpen(false);
            },
        });
    }, []);

    const primeNotificationPanelMount = useCallback(() => {
        setNotificationHostMounted(true);
        primeNotificationHostMount();
    }, []);

    useEffect(() => {
        return registerDashboardOverlayCloser('notifications', () => {
            concealNotificationWarmPanel();
            clearNotificationForceVisible();
            showNotificationsRef.current = false;
            setShowNotifications(false);
            persistNotificationsSessionOpen(false);
        });
    }, []);

    useEffect(() => {
        persistNotificationsSessionOpen(showNotifications);
    }, [showNotifications]);

    const openNotifications = useCallback(() => {
        openNotificationsFromShell({
            signedIn: isRealSignedIn(userId),
            onSignedOut: () =>
                SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${NOTIFICATIONS_SHELL_FEATURE}`),
            onOpen: () => {
                if (showNotificationsRef.current || openInFlightRef.current) return;
                openInFlightRef.current = true;
                try {
                    commitNotificationShellOpen({
                        userId,
                        showNotificationsRef,
                        setNotificationHostMounted,
                        setShowNotifications,
                    });
                } finally {
                    openInFlightRef.current = false;
                }
            },
        });
    }, [userId]);

    useEffect(() => {
        if (!import.meta.env.DEV || typeof window === 'undefined') return;
        const w = window as Window & {
            __hamiE2eForceOpenNotifications?: () => void;
            __hamiE2eNotificationDebug?: () => {
                showNotifications: boolean;
                notificationPanelMounted: boolean;
            };
        };
        w.__hamiE2eForceOpenNotifications = () => openNotifications();
        w.__hamiE2eNotificationDebug = () => ({
            showNotifications,
            notificationPanelMounted: showNotifications || notificationHostMounted,
        });
        return () => {
            delete w.__hamiE2eForceOpenNotifications;
            delete w.__hamiE2eNotificationDebug;
        };
    }, [notificationHostMounted, openNotifications, showNotifications]);

    return {
        showNotifications,
        setShowNotifications,
        closeNotifications,
        notificationPanelSessionKey,
        notificationHostMounted,
        openNotifications,
        searchNotifications,
        notificationsUnreadCount,
        caseSharePendingCount,
        primeNotificationPanelMount,
        bumpNotificationPanelSession: () => setNotificationPanelSessionKey((k) => k + 1),
    };
}
