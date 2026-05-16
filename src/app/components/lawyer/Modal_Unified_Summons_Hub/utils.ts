import { parseLocalNotificationDate } from '@/app/utils/executionStateMachine';

export const AR_TABLIGH_ORD: Record<number, string> = {
    1: 'واحد',
    2: 'اثنين',
    3: 'ثلاثة',
    4: 'أربعة',
    5: 'خمسة',
    6: 'ستة',
    7: 'سبعة',
    8: 'ثمانية',
    9: 'تسعة',
    10: 'عشرة',
};

export function headingForSubsequentNotice(registrationIndex: number): string {
    if (registrationIndex < 1) return 'تبليغ';
    const w = AR_TABLIGH_ORD[registrationIndex];
    return w ? `تبليغ رقم ${w}` : `تبليغ رقم ${registrationIndex}`;
}

export function validateDate(inputDate: string): { ok: boolean; error?: string } {
    const trimmed = String(inputDate || '').trim();
    if (!trimmed) return { ok: false, error: 'أدخل تاريخ التبليغ' };
    const selectedDate = parseLocalNotificationDate(trimmed);
    selectedDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate > today) return { ok: false, error: 'لا يمكن إدخال تاريخ تبليغ مستقبلي' };
    return { ok: true };
}
