import { useCallback, useMemo, useRef, useState } from 'react';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { useDismissedAlertIds } from '@/app/hooks/useDismissedAlertIds';
import { filterVisibleAlerts } from '@/app/services/appAlertDismiss';
import { markAlertSeenForPush } from '@/app/services/appAlertPushSync';
import { useNotificationStore } from '@/app/stores/notificationStore';

type AlertsSlice = {
    alerts: SecretaryAlert[];
    loading: boolean;
    error: string | null;
};

function alertsSliceEqual(a: AlertsSlice, b: AlertsSlice): boolean {
    return (
        a.loading === b.loading &&
        a.error === b.error &&
        a.alerts.length === b.alerts.length &&
        a.alerts.every((item, i) => item.id === b.alerts[i]?.id)
    );
}

export function useLawyerDashboardAppAlerts(userId: string | undefined) {
    const [alertsSlice, setAlertsSlice] = useState<AlertsSlice>({
        alerts: [],
        loading: false,
        error: null,
    });
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
            refreshAppAlertsRef.current = payload.refresh;
            setAlertsSlice((prev) => {
                const next: AlertsSlice = {
                    alerts: payload.alerts,
                    loading: payload.loading,
                    error: payload.error,
                };
                return alertsSliceEqual(prev, next) ? prev : next;
            });
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
        () => filterVisibleAlerts(alertsSlice.alerts, dismissedIds),
        [alertsSlice.alerts, dismissedIds],
    );

    const handleAlertResolved = useCallback(
        (alert: SecretaryAlert) => {
            dismissAppAlert(alert.id);
            void refreshAppAlerts();
        },
        [dismissAppAlert, refreshAppAlerts],
    );

    return {
        appAlerts: alertsSlice.alerts,
        appAlertsLoading: alertsSlice.loading,
        appAlertsError: alertsSlice.error,
        refreshAppAlertsRef,
        refreshAppAlerts,
        handleAlertsFromBackground,
        dismissAppAlert,
        visibleAppAlerts,
        handleAlertResolved,
    };
}
