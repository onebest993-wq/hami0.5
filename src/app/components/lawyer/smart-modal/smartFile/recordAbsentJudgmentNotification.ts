import type { CaseStage, TimelineEvent } from '../../LawyerShared';
import {
    JUDGMENT_FORM_GHIABI,
    isMixedJudgmentForm,
    listJudgmentDispositionDefendants,
    normalizePartyJudgmentDispositions,
    seedPartyJudgmentDispositions,
} from '@/app/domain/lawsuit/partyJudgmentDisposition';
import {
    applySeverableLaneLapses,
    attachPartyChallengeLanes,
    hasUnservedGhayabiLane,
    isScalarGhayabiJudgmentForm,
    listUnservedGhayabiNoticeOptions,
    markLanesServed,
} from '@/app/domain/lawsuit/partyChallengeLanes';
import { computeAbsentObjectionDeadline } from './absentJudgmentFlow';

export type RecordAbsentJudgmentNotificationInput = {
    sourceStage: CaseStage;
    notificationDate: string;
    partyId?: string | null;
    partyIds?: Array<number | string> | null;
    todayYmd?: string;
    nowMs?: number;
};

export type RecordAbsentJudgmentNotificationResult =
    | { ok: false; error: string }
    | {
          ok: true;
          patch: Partial<CaseStage>;
          partyName: string;
          partyIds: string[];
          stillAwaiting: boolean;
          objectionDeadline: string;
      };

function resolveNoticePartyIds(
    input: RecordAbsentJudgmentNotificationInput,
    options: Array<{ partyId: string }>,
): string[] {
    const merged: string[] = [];
    for (const raw of [...(input.partyIds ?? []), input.partyId ?? '']) {
        const id = String(raw ?? '').trim();
        if (id && !merged.includes(id)) merged.push(id);
    }
    if (merged.length === 0 && options.length === 1) {
        return [options[0]!.partyId];
    }
    return merged;
}

function seedGhayabiDispositions(stage: CaseStage) {
    const existing = normalizePartyJudgmentDispositions(stage.partyJudgmentDispositions);
    if (existing.length > 0) return existing;
    if (!isScalarGhayabiJudgmentForm(stage.judgmentForm)) return existing;
    return seedPartyJudgmentDispositions(
        listJudgmentDispositionDefendants(stage.parties ?? []),
        JUDGMENT_FORM_GHIABI,
    );
}

export function recordAbsentJudgmentNotification(
    input: RecordAbsentJudgmentNotificationInput,
): RecordAbsentJudgmentNotificationResult {
    const notificationDate = String(input.notificationDate ?? '').trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(notificationDate)) {
        return { ok: false, error: 'حدّد تاريخ التبليغ' };
    }

    const dispositions = seedGhayabiDispositions(input.sourceStage);
    const working: CaseStage = {
        ...input.sourceStage,
        ...(dispositions.length > 0 ? { partyJudgmentDispositions: dispositions } : {}),
    };
    const seeded = attachPartyChallengeLanes(working, {
        dispositions,
        judgmentDate: working.decisionDate,
        integrity: working.disputeIntegrity,
        today: input.todayYmd,
        judgmentForm: working.judgmentForm,
    });
    const options = listUnservedGhayabiNoticeOptions({
        parties: working.parties,
        dispositions,
        lanes: seeded.partyChallengeLanes,
        judgmentForm: working.judgmentForm,
    });
    const partyIds = resolveNoticePartyIds(input, options);
    if (options.length === 0) {
        return { ok: false, error: 'لا يوجد غائب بانتظار التبليغ' };
    }
    if (partyIds.length === 0) {
        return { ok: false, error: 'حدّد المدعى عليه الغائب الذي تم تبليغه' };
    }
    if (partyIds.some((partyId) => !options.some((row) => row.partyId === partyId))) {
        return { ok: false, error: 'لا يوجد غائب بانتظار التبليغ' };
    }

    const partyName = partyIds
        .map((partyId) => options.find((row) => row.partyId === partyId)?.name ?? '')
        .filter(Boolean)
        .join('، ');
    const servedLanes = markLanesServed(seeded.partyChallengeLanes, partyIds, notificationDate);
    const nextLanes = applySeverableLaneLapses(
        servedLanes ?? [],
        working.disputeIntegrity,
        input.todayYmd ?? notificationDate,
    );
    const served = nextLanes.filter((lane) => partyIds.includes(lane.partyId) && lane.servedAt);
    if (served.length !== partyIds.length) {
        return { ok: false, error: 'تعذّر تسجيل التبليغ لهذا الطرف' };
    }

    const objectionDeadline =
        served[0]?.objectionDeadline ?? computeAbsentObjectionDeadline(notificationDate);
    const stillAwaiting = hasUnservedGhayabiLane(nextLanes);
    const mixed = isMixedJudgmentForm(working.judgmentForm);
    const timeline: TimelineEvent[] = [
        {
            id: `abs_notif_${input.nowMs ?? Date.now()}`,
            type: 'decision',
            date: notificationDate,
            title: 'التبليغ بالحكم الغيابي',
            details: `تم تسجيل تبليغ الحكم الغيابي بتاريخ ${notificationDate}${partyName ? ` — ${partyName}` : ''}.`,
            isSystemLog: true,
            isNew: true,
        },
        ...(working.timeline ?? []),
    ];

    return {
        ok: true,
        partyName,
        partyIds,
        stillAwaiting,
        objectionDeadline,
        patch: {
            partyChallengeLanes: nextLanes,
            ...(dispositions.length > 0 ? { partyJudgmentDispositions: dispositions } : {}),
            absentJudgmentNotificationDate: notificationDate,
            awaitingAbsentJudgmentNotification: stillAwaiting,
            appealDeadline: mixed
                ? working.appealDeadline
                : (working.appealDeadline ?? objectionDeadline),
            finalDecision: mixed
                ? (stillAwaiting
                    ? 'بانتظار التبليغ والطعن'
                    : working.finalDecision)
                : stillAwaiting
                  ? 'حكم غيابي — بانتظار التبليغ والاعتراض'
                  : 'حكم غيابي — بانتظار اعتراض المدعى عليه',
            legalTimers: {
                ...(working.legalTimers ?? {}),
                defaultObjectionDeadline: objectionDeadline,
            },
            timeline,
        },
    };
}
