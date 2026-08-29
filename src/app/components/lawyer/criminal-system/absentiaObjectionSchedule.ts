import type { DecisionCaseType } from './decisionAppealPeriodEngine';

const MS_PER_DAY = 86_400_000;

function startOfLocalDayMs(isoDate: string): number {
    const raw = String(isoDate ?? '').trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (!m) return NaN;
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function addCalendarDaysIso(isoDate: string, days: number): string {
    const start = startOfLocalDayMs(isoDate);
    if (!Number.isFinite(start)) return '';
    return new Date(start + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** مهلة الاعتراض الغيابي من تاريخ التبليغ بالنشر. */
export function resolveAbsentiaObjectionDays(caseType: DecisionCaseType): number {
    if (caseType === 'مخالفة') return 30;
    if (caseType === 'جنحة') return 90;
    return 180;
}

export function resolveAbsentiaObjectionDeadline(
    publicationDate: string,
    caseType: DecisionCaseType,
): string {
    return addCalendarDaysIso(publicationDate, resolveAbsentiaObjectionDays(caseType));
}

export { startOfLocalDayMs };
