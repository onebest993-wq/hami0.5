import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { filterVisibleAlerts } from '@/app/services/appAlertDismiss';
import { countHighPriorityAlerts } from '@/app/services/alertMappers';

/** تنبيهات الشريط العلوي — عاجل وحرج فقط */
export function alertsForHomeStrip(alerts: SecretaryAlert[]): SecretaryAlert[] {
    return alerts.filter(
        (a) =>
            a.priority <= 2 ||
            a.type === 'REQUEST' ||
            a.type === 'URGENT' ||
            a.type === 'HEARING' ||
            a.type === 'EXECUTION',
    );
}

export function headerBadgeFromAlerts(
    alerts: SecretaryAlert[],
    dismissedIds?: string[],
): number {
    const visible = filterVisibleAlerts(alerts, dismissedIds);
    return countHighPriorityAlerts(visible);
}
