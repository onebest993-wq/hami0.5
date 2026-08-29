import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { useIncomingCaseShares } from '@/app/hooks/useIncomingCaseShares';
import { useNotificationBackgroundSync } from '@/app/hooks/lawyerDashboard/useNotificationBackgroundSync';
import {
    NOTIFICATIONS_SHELL_FEATURE,
    computeNotificationsShellUnreadCount,
    openNotificationsFromShell,
} from '@/app/services/notifications/notificationShellNavigation';
import { hasLocalAppSession } from '@/app/services/auth/shellAuth';
import { registerDashboardOverlayCloser } from '@/app/hooks/lawyerDashboard/dashboardOverlayCoordinator';
import { executeNotificationsOverlayClose } from '@/app/runtime/overlaySnapClose';
import { concealNotificationWarmPanel } from '@/app/runtime/notificationInstantPaint';
import {
    persistNotificationsSessionOpen,
    readInitialNotificationsSession,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import { peekNotificationUnreadCount } from '@/app/infrastructure/notificationPeekLite';
import { beginNotificationShellOpen as beginNotificationShellOpenFlow } from '@/app/hooks/lawyerDashboard/notifications/notificationShellOpenFlow';
import { beginNotificationShellExit, clearNotificationShellClosing } from '@/app/hooks/lawyerDashboard/notifications/notificationShellExit';
import {
    isNotificationShellSnappedOpen,
    snapNotificationShellClose,
} from '@/app/services/notifications/notificationShellSnap';
import { suppressNotificationReopen } from '@/app/services/notifications/notificationReopenGuard';
import { shouldKeepNotificationHostWarm } from '@/app/services/notifications/notificationHostKeepAlive';
import {
    primeNotificationHostMount,
    useNotificationHostLifecycle,
} from '@/app/hooks/lawyerDashboard/notifications/useNotificationHostLifecycle';
import {
    useNotificationStoreSync,
    type SearchNotificationRow,
} from '@/app/hooks/lawyerDashboard/notifications/useNotificationStoreSync';
import { useNotificationOsPanelOpen } from '@/app/hooks/lawyerDashboard/notifications/useNotificationOsPanelOpen';
import { useNotificationE2eWindow } from '@/app/hooks/lawyerDashboard/notifications/useNotificationE2eWindow';

/**
 * فتح/إغلاق لوحة الإشعارات — نمط الإعدادات:
 * - فتح: محاولة ورقة أندرويد الأصلية إن فُعّلت، وإلا snap + commit متزامن
 * - إغلاق: conceal فوري + toggle من الجرس
 */
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
    const showNotificationsRef = useRef(initialSession.open);
    const openInFlightRef = useRef(false);
    const closingRef = useRef(false);
    const notificationHostMountedRef = useRef(notificationHostMounted);
    showNotificationsRef.current = showNotifications;
    notificationHostMountedRef.current = notificationHostMounted;

    useEffect(() => {
        setStoreUnreadCount(peekNotificationUnreadCount(userId));
    }, [userId]);

    useEffect(() => {
        if (hasLocalAppSession(userId)) return;
        if (!showNotificationsRef.current && !initialSession.open) return;
        snapNotificationShellClose();
        concealNotificationWarmPanel();
        showNotificationsRef.current = false;
        closingRef.current = false;
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
        if (closingRef.current) return;
        if (!showNotificationsRef.current && !isNotificationShellSnappedOpen()) {
            clearNotificationShellClosing();
            concealNotificationWarmPanel();
            persistNotificationsSessionOpen(false);
            return;
        }
        closingRef.current = true;
        openInFlightRef.current = false;
        suppressNotificationReopen();
        beginNotificationShellExit(() => {
            showNotificationsRef.current = false;
            executeNotificationsOverlayClose({
                conceal: () => {
                    snapNotificationShellClose();
                    concealNotificationWarmPanel();
                },
                commit: () => {
                    setShowNotifications(false);
                    persistNotificationsSessionOpen(false);
                    closingRef.current = false;
                    if (!shouldKeepNotificationHostWarm()) {
                        setNotificationHostMounted(false);
                    }
                },
            });
        });
    }, []);

    const primeNotificationPanelMount = useCallback(() => {
        setNotificationHostMounted(true);
        primeNotificationHostMount();
    }, []);

    useEffect(() => {
        return registerDashboardOverlayCloser('notifications', closeNotifications);
    }, [closeNotifications]);

    useEffect(() => {
        persistNotificationsSessionOpen(showNotifications);
    }, [showNotifications]);

    const syncReactClosedWhenSnapGone = useCallback(() => {
        if (openInFlightRef.current) return;
        if (isNotificationShellSnappedOpen()) return;
        clearNotificationShellClosing();
        if (!showNotificationsRef.current) return;
        /* snap أُغلق دون setState — aria-modal كان يخفي بلاطة الرئيسية عن Playwright */
        showNotificationsRef.current = false;
        setShowNotifications(false);
        persistNotificationsSessionOpen(false);
        closingRef.current = false;
        concealNotificationWarmPanel();
    }, []);

    useLayoutEffect(() => {
        syncReactClosedWhenSnapGone();
        if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
        const observer = new MutationObserver(syncReactClosedWhenSnapGone);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-hami-notifications-open', 'data-hami-notifications-closing'],
        });
        return () => observer.disconnect();
    }, [showNotifications, syncReactClosedWhenSnapGone]);

    const beginNotificationShellOpen = useCallback(() => {
        beginNotificationShellOpenFlow({
            userId,
            showNotificationsRef,
            setNotificationHostMounted,
            setShowNotifications,
            openInFlightRef,
        });
    }, [userId]);

    const runNotificationShellOpen = useCallback(
        (mode: 'toggle' | 'ensure') => {
            openNotificationsFromShell({
                signedIn: hasLocalAppSession(userId),
                onSignedOut: () =>
                    SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${NOTIFICATIONS_SHELL_FEATURE}`),
                onOpen: () => {
                    if (showNotificationsRef.current) {
                        if (mode === 'toggle') closeNotifications();
                        return;
                    }
                    beginNotificationShellOpen();
                },
            });
        },
        [beginNotificationShellOpen, closeNotifications, userId],
    );

    const openNotifications = useCallback(() => {
        runNotificationShellOpen('toggle');
    }, [runNotificationShellOpen]);

    /** فتح من نقر إشعار النظام — لا يُغلِق اللوحة إن كانت مفتوحة أصلاً */
    const ensureNotificationsOpen = useCallback(() => {
        runNotificationShellOpen('ensure');
    }, [runNotificationShellOpen]);

    useNotificationOsPanelOpen(ensureNotificationsOpen);
    useNotificationE2eWindow({
        userId,
        closeNotifications,
        openInFlightRef,
        showNotificationsRef,
        notificationHostMountedRef,
        setNotificationHostMounted,
        setShowNotifications,
    });

    return {
        showNotifications,
        closeNotifications,
        notificationHostMounted,
        openNotifications,
        searchNotifications,
        notificationsUnreadCount,
        primeNotificationPanelMount,
    };
}
