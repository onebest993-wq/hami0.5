import type { TimelineEvent } from '../../LawyerShared';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';

export type SessionRecordFormData = {
    date: string;
    sessionNumber: string;
    proceedings: string;
    judgeDecisions: string;
    nextHearingDate: string;
    recordScope?: 'court' | 'opponent';
};

const SESSION_RECORD_HINT_RE = /جلسة|محضر|مرافعة/i;
const SESSION_NUMBER_RE = /رقم\s*الجلس[ةه]\s*[:\-]?\s*(\d+)/i;
const SESSION_TITLE_NUMBER_RE = /(?:الجلسة|محضر\s*الجلسة|جلسة\s*مرافعة)\s*(?:رقم\s*)?(\d+)/i;
const PROCEEDINGS_RE = /مجريات\s*الدعوى\s*[:\-]?\s*\n?([\s\S]*?)(?=\n\nقرارات\s*القاضي|$)/i;
const OPPONENT_PROCEEDINGS_RE = /تحركات\s*(?:الطرف\s*الآخر\s*\/\s*وكيل\s*الخصم|وكيل\s*الخصم)\s*[:\-]?\s*\n?([\s\S]*?)$/i;
const JUDGE_DECISIONS_RE = /قرارات\s*القاضي\s*[:\-]?\s*\n?([\s\S]*?)(?=\n\nتاريخ\s*المرافعة\s*القادمة|$)/i;
const NEXT_HEARING_RE = /تاريخ\s*المرافعة\s*القادمة\s*[:\-]?\s*(\d{4}-\d{2}-\d{2})/i;

export function isOpponentProceedingsEvent(event: TimelineEvent): boolean {
    if (event.isDeleted) return false;
    if (event.isOpponentProceedings) return true;
    return /تحركات\s*(الطرف|وكيل)/i.test(String(event.title ?? ''));
}

export function isSessionTimelineEvent(event: TimelineEvent): boolean {
    if (event.isDeleted) return false;
    if (event.isSessionRecord) return true;
    if (isOpponentProceedingsEvent(event)) return true;
    return event.type === 'decision' && SESSION_RECORD_HINT_RE.test(event.title || '');
}

export function parseSessionRecordEvent(event: TimelineEvent): SessionRecordFormData {
    const details = String(event.details ?? '');
    const sessionFromDetails = details.match(SESSION_NUMBER_RE)?.[1];
    const sessionFromTitle = event.title.match(SESSION_TITLE_NUMBER_RE)?.[1];
    const proceedingsMatch = details.match(PROCEEDINGS_RE);
    const opponentProceedingsMatch = details.match(OPPONENT_PROCEEDINGS_RE);
    const judgeMatch = details.match(JUDGE_DECISIONS_RE);
    const nextMatch = details.match(NEXT_HEARING_RE);

    let proceedings = proceedingsMatch?.[1]?.trim() || opponentProceedingsMatch?.[1]?.trim() || '';
    if (!proceedings && !judgeMatch && !nextMatch) {
        proceedings = details.replace(SESSION_NUMBER_RE, '').trim();
    }

    return {
        date: event.date || getLocalTodayYmd(),
        sessionNumber: sessionFromDetails || sessionFromTitle || '',
        proceedings,
        judgeDecisions: judgeMatch?.[1]?.trim() || '',
        nextHearingDate: nextMatch?.[1]?.trim() || '',
    };
}

export function computeNextSessionNumber(timeline: TimelineEvent[]): number {
    let max = 0;
    let count = 0;

    for (const event of timeline) {
        if (!isSessionTimelineEvent(event)) continue;
        count += 1;
        const parsed = parseSessionRecordEvent(event);
        const n = Number.parseInt(parsed.sessionNumber, 10);
        if (Number.isFinite(n) && n > 0) max = Math.max(max, n);
    }

    const pleadingAppointments = timeline.filter(
        (e) => !e.isDeleted && e.type === 'appointment' && e.subType === 'pleading',
    ).length;

    return Math.max(max, count, pleadingAppointments) + 1;
}

/** تاريخ جلسة المرافعة الجارية — افتراضياً اليوم. */
export function suggestCurrentHearingDate(timeline: TimelineEvent[]): string {
    const today = getLocalTodayYmd();
    const todayAppt = timeline.find(
        (e) => !e.isDeleted && e.type === 'appointment' && e.subType === 'pleading' && e.date === today,
    );
    if (todayAppt) return today;

    const lastSessionDate = timeline
        .filter(isSessionTimelineEvent)
        .map((e) => e.date)
        .filter(Boolean)
        .sort()
        .pop();
    return lastSessionDate && lastSessionDate <= today ? lastSessionDate : today;
}

/** @deprecated use suggestCurrentHearingDate */
export function suggestHearingDate(timeline: TimelineEvent[]): string {
    return suggestCurrentHearingDate(timeline);
}

/** تاريخ المرافعة القادمة من مواعيد الجلسات بعد تاريخ الجلسة الحالية. */
export function suggestNextHearingDate(timeline: TimelineEvent[], afterDate?: string): string {
    const pivot = (afterDate || getLocalTodayYmd()).slice(0, 10);
    const dates = timeline
        .filter((e) => !e.isDeleted && e.type === 'appointment' && e.subType === 'pleading')
        .map((e) => e.date?.slice(0, 10))
        .filter((d): d is string => Boolean(d))
        .sort();

    return dates.find((d) => d > pivot) || '';
}

export function buildSessionRecordPayload(
    data: SessionRecordFormData,
    editId?: string,
): { id?: string; title: string; date: string; details: string; isStayed: false; isSessionRecord?: boolean; nextHearingDate?: string } {
    const sessionNumber = String(data.sessionNumber).trim();
    const proceedings = String(data.proceedings).trim();
    const judgeDecisions = String(data.judgeDecisions ?? '').trim();
    const nextHearingDate = String(data.nextHearingDate ?? '').trim();

    const parts = [`رقم الجلسة: ${sessionNumber}`];
    if (nextHearingDate) {
        parts.push(`تاريخ المرافعة القادمة: ${nextHearingDate}`);
    }
    parts.push(
        '',
        'مجريات الدعوى:',
        proceedings,
        '',
        'قرارات القاضي:',
        judgeDecisions || '—',
    );

    return {
        ...(editId ? { id: editId } : {}),
        title: `محضر الجلسة ${sessionNumber}`,
        date: data.date,
        details: parts.join('\n'),
        isStayed: false,
        isSessionRecord: true,
        nextHearingDate: nextHearingDate || undefined,
    };
}

export function buildOpponentProceedingsPayload(
    data: SessionRecordFormData,
    editId?: string,
): {
    id?: string;
    title: string;
    date: string;
    details: string;
    isStayed: false;
    isSessionRecord: true;
    isOpponentProceedings: true;
} {
    const sessionNumber = String(data.sessionNumber).trim();
    const proceedings = String(data.proceedings).trim();
    const nextHearingDate = String(data.nextHearingDate ?? '').trim();

    const parts = [`رقم الجلسة: ${sessionNumber}`];
    if (nextHearingDate) {
        parts.push(`تاريخ المرافعة القادمة: ${nextHearingDate}`);
    }
    parts.push('', 'تحركات الطرف الآخر / وكيل الخصم:', proceedings || '—');

    return {
        ...(editId ? { id: editId } : {}),
        title: `تحركات وكيل الخصم — جلسة ${sessionNumber}`,
        date: data.date,
        details: parts.join('\n'),
        isStayed: false,
        isSessionRecord: true,
        isOpponentProceedings: true,
    };
}
