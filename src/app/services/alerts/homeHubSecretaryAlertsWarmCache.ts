import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { patchDashboardFrame1Snapshot } from '@/app/bootstrap/dashboardFrame1Snapshot';

let warmed: { lawyerId: string; alerts: SecretaryAlert[] } | null = null;

/** يُستدعى من useAppAlerts بعد كل تحديث ناجح */
export function writeHomeHubSecretaryAlertsCache(lawyerId: string | null, alerts: SecretaryAlert[]): void {
    if (!lawyerId) {
        warmed = null;
        return;
    }
    warmed = { lawyerId, alerts: Array.isArray(alerts) ? alerts : [] };
    patchDashboardFrame1Snapshot(lawyerId, {
        secretaryAlertCount: warmed.alerts.length,
    });
}

export function peekHomeHubSecretaryAlertsCache(lawyerId: string | null): SecretaryAlert[] | null {
    if (!lawyerId || !warmed || warmed.lawyerId !== lawyerId) return null;
    return warmed.alerts;
}

export function resetHomeHubSecretaryAlertsCacheForTests(): void {
    warmed = null;
}
