import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';

let warmed: { lawyerId: string; alerts: SecretaryAlert[] } | null = null;

/** يُستدعى من useAppAlerts بعد كل تحديث ناجح */
export function writeHomeHubSecretaryAlertsCache(lawyerId: string | null, alerts: SecretaryAlert[]): void {
    if (!lawyerId) {
        warmed = null;
        return;
    }
    warmed = { lawyerId, alerts: Array.isArray(alerts) ? alerts : [] };
}

export function peekHomeHubSecretaryAlertsCache(lawyerId: string | null): SecretaryAlert[] | null {
    if (!lawyerId || !warmed || warmed.lawyerId !== lawyerId) return null;
    return warmed.alerts;
}

export function resetHomeHubSecretaryAlertsCacheForTests(): void {
    warmed = null;
}
