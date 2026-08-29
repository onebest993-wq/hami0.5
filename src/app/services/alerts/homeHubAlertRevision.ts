import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';

/** بصمة خفيفة لاكتشاف تحديث محتوى التنبيه دون إعادة رسم كاملة عند تغيّر الحقول فقط */
export function secretaryAlertRevisionKey(alert: SecretaryAlert): string {
    return [
        alert.id,
        alert.title ?? '',
        alert.priority,
        alert.dueAt ?? '',
        alert.summary ?? '',
        alert.type,
        alert.target ?? '',
        String(alert.entityId ?? ''),
        alert.calendarSource?.eventId ?? '',
    ].join('\u001f');
}

export function secretaryAlertsRevisionEqual(a: SecretaryAlert[], b: SecretaryAlert[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((item, index) => secretaryAlertRevisionKey(item) === secretaryAlertRevisionKey(b[index]!));
}

export type AlertsHubPushSlice = {
    alerts: SecretaryAlert[];
    loading: boolean;
    error: string | null;
};

/** هل دفعة الخلفية مطابقة لما وُصل للوحة — بالمحتوى لا بالمعرّف فقط */
export function alertsHubPayloadUnchanged(
    prev: AlertsHubPushSlice | null,
    next: AlertsHubPushSlice,
): boolean {
    if (!prev) return false;
    return (
        prev.loading === next.loading &&
        prev.error === next.error &&
        secretaryAlertsRevisionEqual(prev.alerts, next.alerts)
    );
}
