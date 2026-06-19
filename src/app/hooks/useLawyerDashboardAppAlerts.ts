import { useCallback, useMemo, useRef, useState } from 'react';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { useDismissedAlertIds } from '@/app/hooks/useDismissedAlertIds';
import { filterVisibleAlerts } from '@/app/services/appAlertDismiss';
import { markAlertSeenForPush } from '@/app/services/appAlertPushSync';
import { useNotificationStore } from '@/app/stores/notificationStore';

export function useLawyerDashboardAppAlerts(userId: string | undefined) {
    const [appAlerts, setAppAlerts] = useState<SecretaryAlert[]>([]);
    const [appAlertsLoading, setAppAlertsLoading] = useState(false);
    const [appAlertsError, setAppAlertsError] = useState<string | null>(null);
    const refreshAppAlertsRef = useRef<() => void>(() => {});

    const refreshAppAlerts = useCallback(() => {
        refreshAppAlertsRef.current();
    }, []);

    const handleAlertsFromBackground = useCallback(
        (payload: {
            alerts: SecretaryAlert[];
            loading: boolean;
            error: string | null;
            refresh: () => void;
        }) => {
            setAppAlerts(payload.alerts);
            setAppAlertsLoading(payload.loading);
            setAppAlertsError(payload.error);
            refreshAppAlertsRef.current = payload.refresh;
        },
        [],
    );

    const { dismissedIds, dismiss: dismissAppAlertBase } = useDismissedAlertIds();
    const markAsReadNotification = useNotificationStore((s) => s.markAsRead);

    const dismissAppAlert = useCallback(
        (alertId: string) => {
            dismissAppAlertBase(alertId);
            markAlertSeenForPush(alertId);
            if (alertId.startsWith('notif:') && userId) {
                const notifId = alertId.slice('notif:'.length);
                void markAsReadNotification(userId, notifId);
            }
        },
        [dismissAppAlertBase, markAsReadNotification, userId],
    );

    const visibleAppAlerts = useMemo(
        () => filterVisibleAlerts(appAlerts, dismissedIds),
        [appAlerts, dismissedIds],
    );

    const handleAlertResolved = useCallback(
        (alert: SecretaryAlert) => {
            dismissAppAlert(alert.id);
            void refreshAppAlerts();
        },
        [dismissAppAlert, refreshAppAlerts],
    );

    return {
        appAlerts,
        appAlertsLoading,
        appAlertsError,
        refreshAppAlertsRef,
        refreshAppAlerts,
        handleAlertsFromBackground,
        dismissAppAlert,
        visibleAppAlerts,
        handleAlertResolved,
    };
}
