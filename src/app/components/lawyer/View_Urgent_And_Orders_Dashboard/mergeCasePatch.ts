import {
    computeUrgentCaseStatus,
    isUrgentCaseClosed,
    isUrgentJudgeDecisionValue,
    type UrgentCase,
} from '../Component_Urgent_Card';

/** دمج patch من الإضبارة في سجل القضية مع إعادة حساب الحالة */
export function mergeUrgentCasePatch(c: UrgentCase, patch: Record<string, unknown>): UrgentCase {
    const merged = { ...c, ...(patch as Record<string, unknown>) } as UrgentCase;
    const notificationDate =
        typeof patch.notificationDate === 'string' && patch.notificationDate
            ? new Date(patch.notificationDate)
            : patch.notificationDate instanceof Date
              ? patch.notificationDate
              : c.notificationDate ?? null;
    const judgeDecision = Object.prototype.hasOwnProperty.call(patch, 'judgeDecision')
        ? isUrgentJudgeDecisionValue(patch.judgeDecision)
            ? patch.judgeDecision
            : patch.judgeDecision === null
              ? null
              : (c.judgeDecision ?? null)
        : (c.judgeDecision ?? null);
    const deadlineDays =
        typeof patch.deadlineDays === 'number' && Number.isFinite(patch.deadlineDays) && patch.deadlineDays > 0
            ? patch.deadlineDays
            : c.deadlineDays ?? null;
    const updated: UrgentCase = { ...merged, notificationDate, judgeDecision, deadlineDays };
    if (isUrgentCaseClosed(updated)) {
        return { ...updated, phase: 'completed', status: 'completed' };
    }
    return { ...updated, status: computeUrgentCaseStatus(updated) };
}
