/** مزامنة قرارات الجبر الشخصي (منفذ العدل) — منطق نقي (موجة 10) */
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';

export type ExecutorDecisionRowLite = {
    requestKind?: string;
    personalCoerciveSubtype?: string;
    executorOutcome?: string;
};

export const FORCED_BRING_MEMO_TITLE_MARKER = 'مسودة مذكرة إحضار';

export function hasApprovedPersonalCoerciveSubtype(
    rows: ExecutorDecisionRowLite[],
    subtype: 'travel_ban' | 'forced_bring_in',
): boolean {
    return rows.some(
        (r) =>
            r.requestKind === 'personal_coercive' &&
            r.personalCoerciveSubtype === subtype &&
            r.executorOutcome === 'approved',
    );
}

export function shouldActivateTravelBanFromDecisions(
    rows: ExecutorDecisionRowLite[],
    travelBanAlreadyActive: boolean | undefined,
): boolean {
    return hasApprovedPersonalCoerciveSubtype(rows, 'travel_ban') && !travelBanAlreadyActive;
}

export function timelineAlreadyHasForcedBringMemo(events: TimelineEvent[]): boolean {
    return events.some((e) => e.title && e.title.includes(FORCED_BRING_MEMO_TITLE_MARKER));
}

export function buildForcedBringInFollowupEvents(
    nextTimelineId: () => string,
): TimelineEvent[] {
    const now = new Date().toISOString();
    const memo: TimelineEvent = {
        id: nextTimelineId(),
        date: now.slice(0, 10),
        timestamp: now,
        title: '📄 مسودة مذكرة إحضار (بعد موافقة المنفذ)',
        description:
            'راجع الصياغة للطباعة وتسليمها لمركز الشرطة / المفرزة. يُسجّل إنجاز المهمة عند إتمام التنفيذ الميداني.',
        type: 'coercive',
        source: 'محضر المتابعة',
    };
    const task: TimelineEvent = {
        id: nextTimelineId(),
        date: now.slice(0, 10),
        timestamp: now,
        title: '📌 مهمة: مرافقة المفرزة أو تسليم مذكرة الإحضار',
        description: 'متابعة ميدانية — حدّد الموعد من «إضافة موعد» إن لزم.',
        type: 'other',
        source: 'محضر المتابعة',
    };
    return [memo, task];
}

export function isExecutiveDetentionExpired(
    until: string | null | undefined,
    nowMs: number = Date.now(),
): boolean {
    if (!until) return false;
    const end = new Date(`${until}T23:59:59`);
    return !Number.isNaN(end.getTime()) && nowMs > end.getTime();
}

export function buildExecutiveDetentionExpiryPatch(): Partial<ExecutionFile> {
    return {
        debtor_executive_detention_active: false,
        executive_detention_until: null,
        executive_detention_days_total: null,
        executive_detention_reminder_sent: false,
        executive_detention_released_or_closed_at: new Date().toISOString(),
    };
}

export function shouldSendExecutiveDetentionReminder(
    until: string | null | undefined,
    reminderSent: boolean | undefined,
    sessionFired: boolean,
    nowMs: number = Date.now(),
): boolean {
    if (reminderSent || sessionFired || !until) return false;
    const end = new Date(`${until}T23:59:59`);
    if (Number.isNaN(end.getTime())) return false;
    const msLeft = end.getTime() - nowMs;
    const twoDays = 2 * 24 * 60 * 60 * 1000;
    return msLeft > 0 && msLeft <= twoDays;
}

export const EXECUTIVE_DETENTION_REMINDER_MESSAGE =
    '⏳ يتبقّى أقل من يومين على انتهاء الحبس التنفيذي — قرّر طلب التجديد أو المتابعة.';
