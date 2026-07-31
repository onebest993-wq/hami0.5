import type { CaseStage, TimelineEvent } from '@/app/components/lawyer/LawyerShared';
import { normalizeDateToYmd } from '@/app/services/calendar/bridge';
import { syncLawsuitTimelineAppointment } from '@/app/services/calendar/dossierSync/incrementalSync';

export const LAWSUIT_CAL_APPT = {
    sessionNext: (sessionId: string) => `appt_session_next_${sessionId}`,
    appealDeadline: (stageId: string) => `appt_appeal_deadline_${stageId}`,
    judgmentDate: (stageId: string) => `appt_judgment_${stageId}`,
    cassationDeadline: (stageId: string) => `appt_cassation_deadline_${stageId}`,
    reviewDeadline: (stageId: string) => `appt_review_deadline_${stageId}`,
    finalAppealDeadline: (stageId: string) => `appt_final_appeal_deadline_${stageId}`,
    defaultObjectionDeadline: (stageId: string) => `appt_default_objection_deadline_${stageId}`,
} as const;

export type LawsuitLegalCalendarSpec = {
    id: string;
    date: string | null;
    title: string;
    details?: string;
    subType?: TimelineEvent['subType'];
};

type MirrorContext = {
    userId?: string | null;
    fileId: string;
    caseNo?: string;
    court?: string;
    parties?: unknown;
    clientName?: string;
};

function stageDegreeLabel(stageName?: string | null): 'first_instance' | 'appeal' | 'cassation' | 'other' {
    const raw = String(stageName ?? '').trim();
    if (!raw) return 'other';
    if (raw === 'التمييز' || (raw.includes('تمييز') && !raw.includes('استئناف'))) return 'cassation';
    if (raw.includes('استئناف') && !raw.includes('تمييز')) return 'appeal';
    if (!raw.includes('استئناف') && !raw.includes('التمييز')) return 'first_instance';
    return 'other';
}

function resolveJudgmentMirrorMeta(stage: CaseStage): { title: string; details?: string } {
    const degree = stageDegreeLabel(stage.stageName);
    const finalDecision = typeof stage.finalDecision === 'string' ? stage.finalDecision.trim() : '';
    const stageLabel = String(stage.stageName ?? '').trim();

    if (degree === 'first_instance') {
        return {
            title: 'تاريخ الحكم البدائي',
            details: finalDecision || (stageLabel ? `مرحلة: ${stageLabel}` : undefined),
        };
    }
    if (degree === 'appeal') {
        return {
            title: 'تاريخ الحكم الاستئنافي',
            details: finalDecision || (stageLabel ? `مرحلة: ${stageLabel}` : undefined),
        };
    }
    if (degree === 'cassation') {
        return {
            title: 'تاريخ القرار التمييزي',
            details: finalDecision || (stageLabel ? `مرحلة: ${stageLabel}` : undefined),
        };
    }

    return {
        title: stageLabel ? `تاريخ القرار في ${stageLabel}` : 'تاريخ الحكم',
        details: finalDecision || undefined,
    };
}

function resolveAppealDeadlineMirrorMeta(stage: CaseStage): { title: string; details?: string } {
    const degree = stageDegreeLabel(stage.stageName);
    const stageLabel = String(stage.stageName ?? '').trim();

    if (degree === 'first_instance') {
        return {
            title: 'آخر موعد طعن على الحكم البدائي',
            details: stageLabel ? `مرحلة: ${stageLabel}` : undefined,
        };
    }
    if (degree === 'appeal') {
        return {
            title: 'آخر موعد طعن على الحكم الاستئنافي',
            details: stageLabel ? `مرحلة: ${stageLabel}` : undefined,
        };
    }
    if (degree === 'cassation') {
        return {
            title: 'آخر موعد على القرار التمييزي',
            details: stageLabel ? `مرحلة: ${stageLabel}` : undefined,
        };
    }

    return {
        title: stageLabel ? `آخر موعد في ${stageLabel}` : 'مهلة الطعن',
        details: stageLabel ? `مرحلة: ${stageLabel}` : undefined,
    };
}

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

/** يستخرج كل المُهل/التواريخ القانونية المخزّنة صراحةً في المرحلة (لا حساب آلي). */
export function collectStageLegalCalendarSpecs(
    stage: CaseStage | Record<string, unknown>,
    stageIndex = 0,
): LawsuitLegalCalendarSpec[] {
    const s = stage as CaseStage;
    const stageId = String(s.id ?? `stage_${stageIndex}`).trim() || `stage_${stageIndex}`;
    const timers = (s.legalTimers ?? {}) as {
        appealDeadline?: string;
        cassationDeadline?: string;
        reviewDeadline?: string;
        finalAppealDeadline?: string;
        defaultObjectionDeadline?: string;
    };
    const appealMeta = resolveAppealDeadlineMirrorMeta(s);
    const judgmentMeta = resolveJudgmentMirrorMeta(s);
    const stageLabel = String(s.stageName ?? '').trim();

    return [
        {
            id: LAWSUIT_CAL_APPT.appealDeadline(stageId),
            date: readAppealDeadline(s),
            title: appealMeta.title,
            details: appealMeta.details,
            subType: 'other',
        },
        {
            id: LAWSUIT_CAL_APPT.judgmentDate(stageId),
            date: normalizeDateToYmd(s.decisionDate ?? null),
            title: judgmentMeta.title,
            details: judgmentMeta.details ? String(judgmentMeta.details).slice(0, 120) : undefined,
            subType: 'verdict',
        },
        {
            id: LAWSUIT_CAL_APPT.cassationDeadline(stageId),
            date: normalizeDateToYmd(timers.cassationDeadline ?? null),
            title: 'مهلة التمييز',
            details: stageLabel ? `مرحلة: ${stageLabel}` : undefined,
            subType: 'other',
        },
        {
            id: LAWSUIT_CAL_APPT.reviewDeadline(stageId),
            date: normalizeDateToYmd(timers.reviewDeadline ?? null),
            title: 'مهلة إعادة المحاكمة',
            details: stageLabel ? `مرحلة: ${stageLabel}` : undefined,
            subType: 'other',
        },
        {
            id: LAWSUIT_CAL_APPT.finalAppealDeadline(stageId),
            date: normalizeDateToYmd(timers.finalAppealDeadline ?? null),
            title: 'مهلة الطعن النهائي',
            details: stageLabel ? `مرحلة: ${stageLabel}` : undefined,
            subType: 'other',
        },
        {
            id: LAWSUIT_CAL_APPT.defaultObjectionDeadline(stageId),
            date: normalizeDateToYmd(timers.defaultObjectionDeadline ?? null),
            title: 'مهلة الاعتراض على الحكم الغيابي',
            details: stageLabel ? `مرحلة: ${stageLabel}` : undefined,
            subType: 'other',
        },
    ];
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

/** يرفع مهلة الطعن وتاريخ الحكم والمُهل القانونية المخزّنة إلى مواعيد في الخط الزمني + التقويم */
export function mirrorStageLegalDatesToCalendar(
    stages: CaseStage[],
    stageIndex: number,
    ctx: MirrorContext,
): CaseStage[] {
    const next = [...stages];
    const stage = next[stageIndex];
    if (!stage) return stages;

    const specs = collectStageLegalCalendarSpecs(stage, stageIndex);
    let timeline = stage.timeline ?? [];

    for (const spec of specs) {
        timeline = upsertTimelineAppointment(timeline, {
            id: spec.id,
            date: spec.date,
            title: spec.title,
            details: spec.details,
            subType: spec.subType,
        });
    }

    next[stageIndex] = { ...stage, timeline };

    for (const spec of specs) {
        syncMirrorAppointment(ctx, {
            id: spec.id,
            date: spec.date,
            title: spec.title,
            details: spec.details,
        });
    }

    return next;
}
