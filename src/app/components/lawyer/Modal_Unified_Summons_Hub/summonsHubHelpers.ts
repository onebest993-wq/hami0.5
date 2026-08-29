import { parseLocalNotificationDate } from '@/app/utils/executionStateMachine';

export function todayLocalYmd(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export type SummonsProfile = 'employee_monetary' | 'earner_like' | 'hybrid_fees_non_monetary';

export function validateSummonsDate(inputDate: string): { ok: boolean; error?: string } {
    const trimmed = String(inputDate || '').trim();
    if (!trimmed) return { ok: false, error: 'أدخل تاريخ التبليغ' };
    const selectedDate = parseLocalNotificationDate(trimmed);
    selectedDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate > today) return { ok: false, error: 'لا يمكن إدخال تاريخ تبليغ مستقبلي' };
    return { ok: true };
}
