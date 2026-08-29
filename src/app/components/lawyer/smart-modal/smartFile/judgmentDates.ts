import { formatDateToLocalYmd } from '@/app/utils/localYmd';
import { parseLocalNotificationDate } from '@/app/utils/executionStateMachineChrono';

export function parseJudgmentBaseDate(judgmentDate: unknown): Date {
    const jdRaw = String(judgmentDate ?? '').trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(jdRaw)) {
        return parseLocalNotificationDate(jdRaw);
    }
    return new Date(judgmentDate as string | number | Date);
}

export function addCalendarDaysFrom(base: Date, days: number): string {
    const result = new Date(base);
    result.setDate(result.getDate() + days);
    return formatDateToLocalYmd(result);
}
