import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';

export type UrgencyTone = 'critical' | 'normal';

export function parseAlertDate(value?: string): number | null {
    if (!value) return null;
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : t;
}

export function inferUrgencyTone(alert: SecretaryAlert): UrgencyTone {
    const due = parseAlertDate(alert.dueAt);
    if (due !== null) {
        const h = (due - Date.now()) / (60 * 60 * 1000);
        if (h <= 6) return 'critical';
    }
    return 'normal';
}
