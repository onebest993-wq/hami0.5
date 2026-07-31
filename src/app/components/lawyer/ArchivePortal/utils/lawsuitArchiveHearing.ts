import {
    FIRST_HEARING_TIMELINE_APPT_ID,
} from '@/app/domain/lawsuit/lawsuitFileFactory';
import type { TimelineEvent } from '@/app/components/lawyer/LawyerShared';
import { computeNextSessionNumber } from '@/app/components/lawyer/smart-modal/smartFile/sessionRecordEngine';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeLawsuitArchiveYmd(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (YMD_RE.test(trimmed)) return trimmed;
    const isoPrefix = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    return isoPrefix ? isoPrefix[1] : null;
}

function ymdToMs(ymd: string): number {
    return new Date(`${ymd}T12:00:00`).getTime();
}

function isRecord(v: unknown): v is Record<string, unknown> {
    return v !== null && typeof v === 'object';
}

function pushAppointmentYmds(raw: unknown, out: string[]): void {
    if (!isRecord(raw)) return;
    if (raw.isDeleted === true) return;
    const type = String(raw.type ?? '').trim();
    const id = String(raw.id ?? '').trim();
    if (type !== 'appointment' && !id.startsWith('appt_')) return;
    const dateYmd = normalizeLawsuitArchiveYmd(raw.date);
    const nextYmd = normalizeLawsuitArchiveYmd(raw.nextDate);
    if (dateYmd) out.push(dateYmd);
    if (nextYmd) out.push(nextYmd);
}

function collectAppointmentYmds(file: Record<string, unknown>): string[] {
    const out: string[] = [];
    const pushRoot = (key: 'nextDate' | 'firstHearingDate') => {
        const ymd = normalizeLawsuitArchiveYmd(file[key]);
        if (ymd) out.push(ymd);
    };
    pushRoot('nextDate');
    pushRoot('firstHearingDate');

    const history = Array.isArray(file.history) ? file.history : [];
    for (const row of history) pushAppointmentYmds(row, out);

    const stages = Array.isArray(file.stages) ? file.stages : [];
    for (const stage of stages) {
        if (!isRecord(stage)) continue;
        const timeline = Array.isArray(stage.timeline) ? stage.timeline : [];
        for (const row of timeline) pushAppointmentYmds(row, out);
    }

    return out;
}

function readFirstHearingEventNext(file: Record<string, unknown>): string | null {
    const history = Array.isArray(file.history) ? file.history : [];
    for (const raw of history) {
        if (!isRecord(raw)) continue;
        if (String(raw.id ?? '') !== FIRST_HEARING_TIMELINE_APPT_ID) continue;
        return normalizeLawsuitArchiveYmd(raw.nextDate);
    }
    const stages = Array.isArray(file.stages) ? file.stages : [];
    for (const stage of stages) {
        if (!isRecord(stage)) continue;
        const timeline = Array.isArray(stage.timeline) ? stage.timeline : [];
        for (const raw of timeline) {
            if (!isRecord(raw)) continue;
            if (String(raw.id ?? '') !== FIRST_HEARING_TIMELINE_APPT_ID) continue;
            return normalizeLawsuitArchiveYmd(raw.nextDate);
        }
    }
    return null;
}

export type LawsuitArchiveHearingDisplay = {
    ymd: string;
    label: 'أول مرافعة' | 'المرافعة القادمة';
    sessionNumber: number;
};

function toTimelineEvent(raw: Record<string, unknown>, index: number): TimelineEvent | null {
    const date = String(raw.date ?? '').trim();
    const type = String(raw.type ?? '').trim();
    if (!date && !type) return null;
    return {
        id: String(raw.id ?? `archive_evt_${index}`),
        type: (type || 'appointment') as TimelineEvent['type'],
        subType: raw.subType as TimelineEvent['subType'],
        date,
        title: String(raw.title ?? ''),
        details: String(raw.details ?? ''),
        isDeleted: raw.isDeleted === true,
        isSessionRecord: raw.isSessionRecord === true,
        isOpponentProceedings: raw.isOpponentProceedings === true,
    };
}

function collectLawsuitTimelineEvents(file: Record<string, unknown>): TimelineEvent[] {
    const out: TimelineEvent[] = [];
    const history = Array.isArray(file.history) ? file.history : [];
    for (const raw of history) {
        if (!isRecord(raw)) continue;
        const ev = toTimelineEvent(raw, out.length);
        if (ev) out.push(ev);
    }
    const stages = Array.isArray(file.stages) ? file.stages : [];
    for (const stage of stages) {
        if (!isRecord(stage)) continue;
        const timeline = Array.isArray(stage.timeline) ? stage.timeline : [];
        for (const raw of timeline) {
            if (!isRecord(raw)) continue;
            const ev = toTimelineEvent(raw, out.length);
            if (ev) out.push(ev);
        }
    }
    return out;
}

function resolveLawsuitSessionNumber(
    file: Record<string, unknown>,
    label: LawsuitArchiveHearingDisplay['label'],
    upcomingYmd: string,
    firstHearingDate: string | null,
    firstHearingPostponedTo: string | null,
): number {
    if (label === 'أول مرافعة') return 1;
    if (
        firstHearingPostponedTo &&
        upcomingYmd === firstHearingPostponedTo
    ) {
        return 1;
    }
    const events = collectLawsuitTimelineEvents(file);
    const hasSessionRecords = events.some(
        (e) => e.isSessionRecord || e.isOpponentProceedings,
    );
    if (
        !hasSessionRecords &&
        firstHearingDate &&
        upcomingYmd !== firstHearingDate
    ) {
        return 2;
    }
    return computeNextSessionNumber(events);
}

/**
 * يُحدّد تاريخ المرافعة المعروض على بطاقة الأرشيف ومزامنته مع nextDate
 * وأحداث الخط الزمني (بما فيها تأجيل أول مرافعة).
 */
export function resolveLawsuitArchiveHearingDisplay(
    file: Record<string, unknown>,
): LawsuitArchiveHearingDisplay | null {
    const firstHearingDate = normalizeLawsuitArchiveYmd(file.firstHearingDate);
    const fileNextDate = normalizeLawsuitArchiveYmd(file.nextDate);
    const firstHearingPostponedTo = readFirstHearingEventNext(file);

    let upcoming = fileNextDate;
    if (
        firstHearingPostponedTo &&
        firstHearingDate &&
        fileNextDate &&
        fileNextDate === firstHearingDate
    ) {
        upcoming = firstHearingPostponedTo;
    }
    if (!upcoming) upcoming = firstHearingPostponedTo;

    if (!upcoming) {
        const candidates = collectAppointmentYmds(file);
        if (!candidates.length) return null;
        const todayYmd = new Date().toISOString().slice(0, 10);
        const todayMs = ymdToMs(todayYmd);
        const sorted = [...new Set(candidates)].sort((a, b) => ymdToMs(a) - ymdToMs(b));
        const future = sorted.filter((ymd) => ymdToMs(ymd) >= todayMs);
        upcoming = future[0] ?? sorted[sorted.length - 1];
    }

    if (!upcoming) return null;

    const label: LawsuitArchiveHearingDisplay['label'] =
        firstHearingDate && upcoming === firstHearingDate && !firstHearingPostponedTo
            ? 'أول مرافعة'
            : 'المرافعة القادمة';

    return {
        ymd: upcoming,
        label,
        sessionNumber: resolveLawsuitSessionNumber(
            file,
            label,
            upcoming,
            firstHearingDate,
            firstHearingPostponedTo,
        ),
    };
}
