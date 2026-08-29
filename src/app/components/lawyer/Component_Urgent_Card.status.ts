import type { UrgentCase, UrgentCaseStatus } from './Component_Urgent_Card.types';

export const URGENT_MS_PER_DAY = 1000 * 60 * 60 * 24;
export const URGENT_GRIEVANCE_DAYS = 3;

export function urgentStartOfDay(d: Date): number {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function urgentDaysUntil(
    target: Date,
    now: Date = new Date(),
    msPerDay: number = URGENT_MS_PER_DAY,
): number {
    return Math.ceil((urgentStartOfDay(target) - urgentStartOfDay(now)) / msPerDay);
}

export function urgentGrievanceDeadline(
    notificationDate: Date,
    grievanceDays: number = URGENT_GRIEVANCE_DAYS,
    msPerDay: number = URGENT_MS_PER_DAY,
): Date {
    return new Date(notificationDate.getTime() + grievanceDays * msPerDay);
}

export function isUrgentJudgeGrant(decision: unknown): boolean {
    return decision === 'accepted' || decision === 'partially_accepted';
}

export function isUrgentJudgeDecisionRecorded(decision: unknown): boolean {
    return decision === 'accepted' || decision === 'rejected' || decision === 'partially_accepted';
}

export function isUrgentJudgeDecisionValue(
    decision: unknown,
): decision is 'accepted' | 'rejected' | 'partially_accepted' {
    return isUrgentJudgeDecisionRecorded(decision);
}

const toDate = (v: unknown): Date | null => {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v === 'string') {
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
};

export function hasUrgentGrievanceLogged(c: Partial<UrgentCase>): boolean {
    return (
        c.legalState === 'Grievance_Filed' ||
        c.grievanceOutcome === 'filed' ||
        c.grievanceDecision === 'confirmed' ||
        c.grievanceDecision === 'modified' ||
        c.grievanceDecision === 'canceled'
    );
}

export const computeUrgentCaseStatus = (
    c: Omit<UrgentCase, 'status'> & { status?: UrgentCaseStatus },
    opts?: { now?: Date; msPerDay?: number; grievanceDays?: number },
): UrgentCaseStatus => {
    const msPerDay = typeof opts?.msPerDay === 'number' && opts.msPerDay > 0 ? opts.msPerDay : URGENT_MS_PER_DAY;
    const now = opts?.now instanceof Date ? opts.now : new Date();
    const grievanceDays =
        typeof opts?.grievanceDays === 'number' && opts.grievanceDays > 0
            ? opts.grievanceDays
            : URGENT_GRIEVANCE_DAYS;

    if (c.phase === 'completed' || c.status === 'completed') return 'completed';
    if (c.type === 'state_order') {
        if (!c.notificationDate) return 'safe';
        const base = toDate(c.notificationDate);
        if (!base) return 'safe';
        const target = urgentGrievanceDeadline(base, grievanceDays, msPerDay);

        if (c.legalState === 'Awaiting_Grievance' && !hasUrgentGrievanceLogged(c)) {
            const daysLeft = urgentDaysUntil(target, now, msPerDay);
            if (daysLeft < 0) return 'completed';
            if (daysLeft <= 1) return 'critical';
            if (daysLeft <= 3) return 'warning';
            return 'safe';
        }

        const days = urgentDaysUntil(target, now, msPerDay);
        if (days < 0) return 'expired';
        if (days <= 2) return 'critical';
        if (days <= 7) return 'warning';
        return 'safe';
    }

    const targetDate = toDate(c.deadlineDate ?? c.sessionDate);
    if (!targetDate) return 'safe';
    const days = urgentDaysUntil(targetDate, now, msPerDay);
    if (days < 0) return 'expired';
    if (days <= 2) return 'critical';
    if (days <= 7) return 'warning';
    return 'safe';
};

export const isUrgentCaseClosed = (c: Partial<UrgentCase>) => {
    if (!c || typeof c !== 'object') return false;
    if (c.phase === 'completed') return true;
    const judge = c.judgeDecision;
    if (!isUrgentJudgeDecisionRecorded(judge)) return false;
    const grievanceExpired = c.grievanceOutcome === 'expired';
    const grievanceDecided = c.grievanceDecision === 'confirmed' || c.grievanceDecision === 'modified' || c.grievanceDecision === 'canceled';
    const cassationExpired = c.cassationOutcome === 'expired';
    const cassationDecided = c.cassationDecision === 'confirmed' || c.cassationDecision === 'modified' || c.cassationDecision === 'canceled';

    if (isUrgentJudgeGrant(judge) && !c.notificationDate) return false;
    if (judge === 'rejected' && !c.notificationDate) return false;
    if (grievanceExpired) return true;
    if (grievanceDecided && (cassationExpired || cassationDecided)) return true;
    return false;
};

/** منجزة أو مكتسبة القطعية — تُعرض في الأرشيف لا في النشطة */
export function isUrgentCaseFinalized(c: Partial<UrgentCase>): boolean {
    return isUrgentCaseClosed(c) || c.status === 'completed' || c.phase === 'completed';
}

export function isUrgentCaseTrashed(c: Partial<UrgentCase>): boolean {
    return !!c.deleted;
}

export function isUrgentCaseInArchiveScope(c: Partial<UrgentCase>): boolean {
    return !c.deleted && (!!c.archived || isUrgentCaseFinalized(c));
}

export function isUrgentCaseInActiveScope(c: Partial<UrgentCase>): boolean {
    return !c.deleted && !c.archived && !isUrgentCaseFinalized(c);
}

export function getUrgentCasePhaseLabel(c: UrgentCase): string {
    if (c.status === 'completed' || c.phase === 'completed') return 'مكتسب الدرجة القطعية';
    const deadlineDays =
        typeof c.deadlineDays === 'number' && c.deadlineDays > 0 ? c.deadlineDays : URGENT_GRIEVANCE_DAYS;
    if (c.type === 'state_order') {
        if (!isUrgentJudgeDecisionRecorded(c.judgeDecision)) return 'بانتظار قرار القاضي';
        if (!c.notificationDate) return 'بانتظار التبليغ الأصولي';
        if (c.legalState === 'Awaiting_Grievance' && c.notificationDate) {
            const remainingDays = urgentDaysUntil(urgentGrievanceDeadline(new Date(c.notificationDate)));
            if (remainingDays < 0) return 'مكتسب الدرجة القطعية';
            if (remainingDays === 0) return 'اليوم آخر يوم للتظلم';
            if (remainingDays === 1) return 'متبقي يوم واحد للتظلم';
            return `متبقي ${remainingDays} أيام للتظلم`;
        }
        return `مدة التظلم (${URGENT_GRIEVANCE_DAYS} أيام)`;
    }
    switch (c.phase) {
        case 'notification_pending':
            return 'بانتظار التبليغ الأصولي';
        case 'grievance_window':
            return `مدة التظلم (${deadlineDays} أيام)`;
        case 'cassation_window':
            return 'مدة التمييز (7 أيام)';
        default:
            return '';
    }
}
