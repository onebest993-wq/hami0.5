import { formatDateToLocalYmd } from '@/app/utils/executionStateMachine';

function str(v: unknown): string {
    return String(v ?? '').trim();
}

function parseJudgmentDateInput(judgmentDate: unknown): Date {
    if (judgmentDate instanceof Date && !Number.isNaN(judgmentDate.getTime())) {
        return judgmentDate;
    }
    if (typeof judgmentDate === 'number') {
        return new Date(judgmentDate);
    }
    const parsed = new Date(str(judgmentDate));
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function addDaysYmd(base: Date | string, days: number): string {
    const parsed = typeof base === 'string' ? parseJudgmentDateInput(base) : base;
    const result = new Date(parsed);
    result.setDate(result.getDate() + days);
    return formatDateToLocalYmd(result);
}
