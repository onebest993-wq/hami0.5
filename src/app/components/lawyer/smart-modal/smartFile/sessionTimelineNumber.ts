/**
 * رقم الجلسة من تواريخ المرافعات الفريدة — تاريخ مرافعة واحد = جلسة واحدة.
 * بلا executionStateMachine حتى لا يُسحب إلى شبكة الأرشيف.
 */

import type { TimelineEvent } from '../../LawyerShared';
import { isPleadingHearingAppointment } from './timelineLegalDeadline';

const SESSION_RECORD_HINT_RE = /جلسة|محضر|مرافعة/i;

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

export function isCourtSessionRecord(event: TimelineEvent): boolean {
    return isSessionTimelineEvent(event) && !isOpponentProceedingsEvent(event);
}

/** محضر جلسة أو موعد مرافعة — يفتح سجل الجلسات لا محرّر المواعيد. */
export function isSessionHubFocusEvent(event: TimelineEvent): boolean {
    return isCourtSessionRecord(event) || isPleadingHearingAppointment(event);
}

export function normalizeHearingYmd(raw: string | undefined | null): string {
    const value = String(raw ?? '').trim().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
}

export function collectUniqueHearingDates(
    timeline: TimelineEvent[],
    firstHearingDate?: string | null,
): string[] {
    const dates = new Set<string>();
    const first = normalizeHearingYmd(firstHearingDate);
    if (first) dates.add(first);

    for (const event of timeline) {
        if (event.isDeleted) continue;
        if (isCourtSessionRecord(event) || isPleadingHearingAppointment(event)) {
            const ymd = normalizeHearingYmd(event.date);
            if (ymd) dates.add(ymd);
        }
    }

    return Array.from(dates).sort();
}

export function recordedHearingDates(timeline: TimelineEvent[]): Set<string> {
    const recorded = new Set<string>();
    for (const event of timeline) {
        if (!isCourtSessionRecord(event)) continue;
        const ymd = normalizeHearingYmd(event.date);
        if (ymd) recorded.add(ymd);
    }
    return recorded;
}

export function sessionNumberForHearingDate(
    dates: readonly string[],
    date: string,
): number {
    const ymd = normalizeHearingYmd(date);
    if (!ymd) return Math.max(dates.length, 0) + 1;
    const existing = dates.indexOf(ymd);
    if (existing >= 0) return existing + 1;
    const inserted = [...dates, ymd].sort();
    return inserted.indexOf(ymd) + 1;
}

export function findCourtSessionRecordForDate(
    timeline: TimelineEvent[],
    date: string,
): TimelineEvent | null {
    const ymd = normalizeHearingYmd(date);
    if (!ymd) return null;
    return (
        timeline.find(
            (event) => isCourtSessionRecord(event) && normalizeHearingYmd(event.date) === ymd,
        ) ?? null
    );
}

/** رقم الجلسة التالية للكتابة — من أول تاريخ مرافعة بلا محضر، لا من عدّ مزدوج. */
export function computeNextSessionNumber(
    timeline: TimelineEvent[],
    firstHearingDate?: string | null,
): number {
    const dates = collectUniqueHearingDates(timeline, firstHearingDate);
    if (dates.length === 0) return 1;
    const recorded = recordedHearingDates(timeline);
    const unrecorded = dates.filter((d) => !recorded.has(d));
    if (unrecorded.length > 0) return dates.indexOf(unrecorded[0]) + 1;
    return dates.length + 1;
}
