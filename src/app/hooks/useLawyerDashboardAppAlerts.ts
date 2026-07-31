import { useCallback, useMemo, useRef, useState } from 'react';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { useDismissedAlertIds } from '@/app/hooks/useDismissedAlertIds';
import { filterVisibleAlerts } from '@/app/services/appAlertDismiss';
import { peekHomeHubSecretaryAlertsCache } from '@/app/services/alerts/homeHubSecretaryAlertsWarmCache';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';

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
    const calendarUserId = resolveCalendarUserId(userId ?? null);
    const [alertsSlice, setAlertsSlice] = useState<AlertsSlice>(() => {
        const cached = peekHomeHubSecretaryAlertsCache(calendarUserId);
        return {
            alerts: cached ?? [],
            loading: false,
            error: null,
        };
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

    const dismissAppAlert = useCallback(
        (alertId: string) => {
            dismissAppAlertBase(alertId);
            void import('@/app/services/appAlertPushSync')
                .then((m) => m.markAlertSeenForPush(alertId))
                .catch(() => undefined);
            if (alertId.startsWith('notif:') && userId) {
                const notifId = alertId.slice('notif:'.length);
                void import('@/app/stores/notificationStore')
                    .then((m) => m.useNotificationStore.getState().markAsRead(userId, notifId))
                    .catch(() => undefined);
            }
        },
        [dismissAppAlertBase, userId],
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
