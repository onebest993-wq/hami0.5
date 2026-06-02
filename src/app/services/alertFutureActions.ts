import type { SecretaryAlert, SecretaryAlertType, SecretaryAlertTarget } from '@/app/services/SecretaryOrchestrator';
import type { CalendarAlertSource } from '@/app/services/SecretaryOrchestrator';
import { isInjectedFieldTaskAlert } from '@/app/services/fieldTaskAlerts';

function isFieldTaskAlert(alert: SecretaryAlert): boolean {
    if (isInjectedFieldTaskAlert(alert)) return true;
    if (alert.calendarSource?.module === 'task') return true;
    if (alert.target === 'schedule' && alert.type === 'DEADLINE') return true;
    if (alert.type === 'TASK' && alert.target !== 'client_requests') return true;
    return false;
}

function isHearingLikeAlert(alert: {
    type: SecretaryAlertType;
    target: SecretaryAlertTarget;
}): boolean {
    if (alert.type === 'HEARING' || alert.type === 'EXECUTION' || alert.type === 'URGENT') return true;
    if (alert.target === 'lawsuit' || alert.target === 'criminal' || alert.target === 'urgent') {
        return alert.type !== 'DEADLINE' && alert.type !== 'TASK';
    }
    return false;
}

/** نص الزر السفلي للمواعيد القادمة فقط */
export function suggestedFutureActionForAlert(alert: {
    type: SecretaryAlertType;
    target: SecretaryAlertTarget;
    calendarSource?: CalendarAlertSource;
}): string {
    if (isHearingLikeAlert(alert)) {
        return '⚖️ تحضير دفوع الجلسة';
    }
    if (isInjectedFieldTaskAlert(alert)) {
        return '📋 استعراض وإنجاز المهمة الميدانية';
    }
    if (isFieldTaskAlert(alert)) {
        return '📋 استعراض تفاصيل المهمة';
    }
    switch (alert.target) {
        case 'lawsuit':
            return 'فتح إضبارة الدعوى';
        case 'execution':
            return 'فتح إضبارة التنفيذ';
        case 'criminal':
            return 'فتح القضية الجزائية';
        case 'urgent':
            return 'فتح الطلب المستعجل';
        case 'threading':
            return 'فتح المعاملة الإدارية';
        case 'transactions':
            return 'فتح ملف المعاملة';
        case 'notepad':
            return 'فتح المفكرة';
        case 'client_requests':
            return 'مراجعة الطلب';
        default:
            return 'فتح الموعد';
    }
}
