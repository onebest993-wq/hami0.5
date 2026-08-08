import { addDaysYmd } from './judgmentTypes';
import { daysRemainingUntil } from './absentJudgmentFlow';

/** مهلة الاستئناف في البداءة: 15 يوماً من اليوم التالي لصدور القرار */
export const FIRST_INSTANCE_APPEAL_DAYS = 15;

/** مهلة التمييز: شهر (30 يوماً) من تاريخ صدور القرار */
export const CASSATION_APPEAL_DAYS = 30;

export function computeFirstInstanceAppealDeadline(judgmentDateYmd: string): string {
    const base = String(judgmentDateYmd ?? '').trim().slice(0, 10);
    const dayAfter = addDaysYmd(base, 1);
    return addDaysYmd(dayAfter, FIRST_INSTANCE_APPEAL_DAYS);
}

export function computeCassationDeadline(judgmentDateYmd: string): string {
    const base = String(judgmentDateYmd ?? '').trim().slice(0, 10);
    return addDaysYmd(base, CASSATION_APPEAL_DAYS);
}

export function isAppealDeadlineExpired(
    deadlineYmd?: string | null,
    today?: Date,
): boolean {
    const d = String(deadlineYmd ?? '').trim().slice(0, 10);
    if (!d) return false;
    return daysRemainingUntil(d, today) < 0;
}

export function resolveStageCassationDeadline(stage?: {
    decisionDate?: string | null;
    legalTimers?: { cassationDeadline?: string | null };
} | null): string | null {
    const fromTimers = stage?.legalTimers?.cassationDeadline;
    if (fromTimers) return String(fromTimers).slice(0, 10);
    const decision = String(stage?.decisionDate ?? '').trim().slice(0, 10);
    if (!decision) return null;
    return computeCassationDeadline(decision);
}
