import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';

/** بصمة خفيفة لاكتشاف تحديث محتوى التنبيه دون إعادة رسم كاملة عند تغيّر الحقول فقط */
export function secretaryAlertRevisionKey(alert: SecretaryAlert): string {
    return [
        alert.id,
        alert.priority,
        alert.dueAt ?? '',
        alert.summary ?? '',
        alert.type,
        alert.target ?? '',
        String(alert.entityId ?? ''),
        String(alert.request?.status ?? ''),
    ].join('\u001f');
}

export function secretaryAlertsRevisionEqual(a: SecretaryAlert[], b: SecretaryAlert[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((item, index) => secretaryAlertRevisionKey(item) === secretaryAlertRevisionKey(b[index]!));
}
