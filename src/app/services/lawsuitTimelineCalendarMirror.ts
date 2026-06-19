import type { CaseStage, TimelineEvent } from '@/app/components/lawyer/LawyerShared';
import { normalizeDateToYmd } from '@/app/services/calendarBridge';
import { syncLawsuitTimelineAppointment } from '@/app/services/calendarDossierSync';

export const LAWSUIT_CAL_APPT = {
    sessionNext: (sessionId: string) => `appt_session_next_${sessionId}`,
    appealDeadline: (stageId: string) => `appt_appeal_deadline_${stageId}`,
    judgmentDate: (stageId: string) => `appt_judgment_${stageId}`,
} as const;

type MirrorContext = {
    userId?: string | null;
    fileId: string;
    caseNo?: string;
    court?: string;
    parties?: unknown;
    clientName?: string;
};

function upsertTimelineAppointment(
    timeline: TimelineEvent[],
    spec: {
        id: string;
        date?: string | null;
        title: string;
        details?: string;
        subType?: TimelineEvent['subType'];
    },
): TimelineEvent[] {
    const ymd = normalizeDateToYmd(spec.date);
    if (!ymd) {
        return timeline.filter((e) => e.id !== spec.id);
    }
    const appt: TimelineEvent = {
        id: spec.id,
        type: 'appointment',
        date: ymd,
        title: spec.title,
        details: spec.details,
        subType: spec.subType ?? 'other',
        isDeleted: false,
    };
    const idx = timeline.findIndex((e) => e.id === spec.id);
    if (idx >= 0) {
        return timeline.map((e, i) => (i === idx ? { ...e, ...appt } : e));
    }
    return [{ ...appt, isNew: true }, ...timeline];
}

function readAppealDeadline(stage: CaseStage): string | null {
    const direct = normalizeDateToYmd(stage.appealDeadline ?? null);
    if (direct) return direct;
    const timers = stage.legalTimers as { appealDeadline?: string } | undefined;
    return normalizeDateToYmd(timers?.appealDeadline ?? null);
}

function syncMirrorAppointment(
    ctx: MirrorContext,
    event: { id: string; date?: string | null; title: string; details?: string },
): void {
    if (!ctx.fileId) return;
    const ymd = normalizeDateToYmd(event.date);
    if (!ymd) {
        syncLawsuitTimelineAppointment({
            userId: ctx.userId,
            fileId: ctx.fileId,
            event: { id: event.id, isDeleted: true },
            caseNo: ctx.caseNo,
            court: ctx.court,
            parties: ctx.parties,
            clientName: ctx.clientName,
        });
        return;
    }
    syncLawsuitTimelineAppointment({
        userId: ctx.userId,
        fileId: ctx.fileId,
        event: {
            id: event.id,
            date: ymd,
            title: event.title,
            details: event.details,
        },
        caseNo: ctx.caseNo,
        court: ctx.court,
        parties: ctx.parties,
        clientName: ctx.clientName,
    });
}

/** يرفع «تاريخ المرافعة القادمة» من محضر الجلسة إلى موعد في الخط الزمني + التقويم */
export function mirrorSessionNextHearingToCalendar(
    stages: CaseStage[],
    stageIndex: number,
    sessionEventId: string,
    nextHearingDate: string | undefined | null,
    sessionTitle: string,
    ctx: MirrorContext,
): CaseStage[] {
    const next = [...stages];
    const stage = next[stageIndex];
    if (!stage) return stages;

    const apptId = LAWSUIT_CAL_APPT.sessionNext(sessionEventId);
    const timeline = upsertTimelineAppointment(stage.timeline ?? [], {
        id: apptId,
        date: nextHearingDate,
        title: 'مرافعة قادمة',
        details: sessionTitle,
        subType: 'pleading',
    });
    next[stageIndex] = { ...stage, timeline };

    syncMirrorAppointment(ctx, {
        id: apptId,
        date: nextHearingDate,
        title: 'مرافعة قادمة',
        details: sessionTitle,
    });

    return next;
}

/** يرفع مهلة الطعن وتاريخ الحكم من المرحلة إلى مواعيد في الخط الزمني + التقويم */
export function mirrorStageLegalDatesToCalendar(
    stages: CaseStage[],
    stageIndex: number,
    ctx: MirrorContext,
): CaseStage[] {
    const next = [...stages];
    const stage = next[stageIndex];
    if (!stage) return stages;

    const stageId = String(stage.id ?? `stage_${stageIndex}`);
    const appealYmd = readAppealDeadline(stage);
    const judgmentYmd = normalizeDateToYmd(stage.decisionDate ?? null);

    let timeline = stage.timeline ?? [];

    timeline = upsertTimelineAppointment(timeline, {
        id: LAWSUIT_CAL_APPT.appealDeadline(stageId),
        date: appealYmd,
        title: 'مهلة الطعن',
        details: stage.stageName ? `مرحلة: ${stage.stageName}` : undefined,
        subType: 'other',
    });

    timeline = upsertTimelineAppointment(timeline, {
        id: LAWSUIT_CAL_APPT.judgmentDate(stageId),
        date: judgmentYmd,
        title: 'تاريخ الحكم',
        details: stage.finalDecision ? String(stage.finalDecision).slice(0, 120) : undefined,
        subType: 'verdict',
    });

    next[stageIndex] = { ...stage, timeline };

    syncMirrorAppointment(ctx, {
        id: LAWSUIT_CAL_APPT.appealDeadline(stageId),
        date: appealYmd,
        title: 'مهلة الطعن',
        details: stage.stageName ? `مرحلة: ${stage.stageName}` : undefined,
    });

    syncMirrorAppointment(ctx, {
        id: LAWSUIT_CAL_APPT.judgmentDate(stageId),
        date: judgmentYmd,
        title: 'تاريخ الحكم',
        details: stage.finalDecision ? String(stage.finalDecision).slice(0, 120) : undefined,
    });

    return next;
}
