import type { CaseStage, TimelineEvent, Party } from '../../LawyerShared';
import { applyAppealStageTransition } from './appealStageTransition';
import { resolveAppealStageCaseNumber } from './absentObjectionCaseNumber';
import { resolveAbsentObjectionOpeningPriorOutcome } from './stageOutcomeResolution';
import {
    LANE_STATE_OBJECTION,
    attachPartyChallengeLanes,
    markLanesState,
    resolveAbsentObjectionFlipSelection,
} from '@/app/domain/lawsuit/partyChallengeLanes';
import { isMixedJudgmentForm } from '@/app/domain/lawsuit/partyJudgmentDisposition';
import { resolveOpponentChallengeHopSource } from './opponentRegistrationContext';
import {
    findOpenAbsentObjectionStageIndex,
} from './joinGhayabiObjectorToStage';
import { resolveSelectedOpponentPartyIds } from './appealPartyListHelpers';

const ABSENT_OBJECTION_APPEAL_TYPE = 'اعتراض على الحكم الغيابي';

/** خصوم الاعتراض = المدّعون الأصليون فقط — لا شركاء المدعى عليه غير المعترضين. */
export function listGhayabiObjectionOpponentPartyIds(
    parties: Party[] | null | undefined,
    objectorIds: Array<number | string>,
): Array<number | string> {
    return resolveSelectedOpponentPartyIds(parties, objectorIds);
}

export type OpenAbsentObjectionStageInput = {
    stages: CaseStage[];
    activeStageIndex: number;
    currentStage: CaseStage;
    filingDate: string;
    sourceCaseNo?: string;
    newCaseNumber?: string;
    archiveTimelineEvent: TimelineEvent;
    archiveFinalDecision?: string | null;
    archiveDecisionDate?: string | null;
    /** الطرف الغائب المعترض فعلياً — دون قلب بقية المدعى عليهم الحاضرين. */
    objectorPartyIds?: Array<number | string>;
    sessionDate?: string;
};

export type OpenAbsentObjectionStageResult = {
    updatedStages: CaseStage[];
    newActiveIndex: number;
    resolvedCaseNumber: string;
    sessionEventId?: string;
    joinedExisting?: boolean;
    joinError?: string;
    joinedObjectorName?: string;
    /** اعتراض قائم — المعترض اللاحق يجب أن يُنشئ إضبارة مستقلة */
    needsIndependentDossier?: boolean;
};

/**
 * فتح إضبارة الاعتراض على الحكم الغيابي — مرحلة جديدة + انقلاب المراكز.
 * إن وُجدت مرحلة اعتراض قائمة لا يُضمّ أحد؛ يُطلب مسار إضبارة مستقلة.
 */
export function openAbsentObjectionStage(
    input: OpenAbsentObjectionStageInput,
): OpenAbsentObjectionStageResult {
    const existingIndex = findOpenAbsentObjectionStageIndex(input.stages);
    if (existingIndex >= 0) {
        return {
            updatedStages: input.stages,
            newActiveIndex: existingIndex,
            resolvedCaseNumber: String(input.stages[existingIndex]?.caseNo ?? ''),
            needsIndependentDossier: true,
            joinError: 'يوجد اعتراض قائم — المعترض اللاحق يُفتح بإضبارة مستقلة',
        };
    }
    const hop = resolveOpponentChallengeHopSource(
        input.stages,
        input.activeStageIndex,
        ABSENT_OBJECTION_APPEAL_TYPE,
    );
    const sourceStage = hop.stage;
    const hopIndex = hop.index;
    const resolvedCaseNumber = resolveAppealStageCaseNumber(
        ABSENT_OBJECTION_APPEAL_TYPE,
        input.newCaseNumber ?? '',
        sourceStage.caseNo ?? input.sourceCaseNo,
    );

    const flip = resolveAbsentObjectionFlipSelection(input.objectorPartyIds ?? []);
    const includedOpponentPartyIds = flip
        ? listGhayabiObjectionOpponentPartyIds(
            sourceStage.parties,
            flip.includedAppellantPartyIds ?? [],
        )
        : undefined;
    const mixedSource = isMixedJudgmentForm(sourceStage.judgmentForm);
    const { updatedStages, newActiveIndex } = applyAppealStageTransition(
        input.stages,
        hopIndex,
        sourceStage,
        {
            appealType: ABSENT_OBJECTION_APPEAL_TYPE,
            appellant: 'المدعى عليه',
            filingDate: input.filingDate,
            newCaseNumber: resolvedCaseNumber,
            archiveTimelineEvent: input.archiveTimelineEvent,
            archiveFinalDecision:
                input.archiveFinalDecision
                ?? (mixedSource ? 'اعترض الطرف الغائب' : 'حكم غيابي — اعترض المدعى عليه'),
            archiveDecisionDate: input.archiveDecisionDate,
            priorStageOutcome: resolveAbsentObjectionOpeningPriorOutcome(sourceStage),
            includedAppellantPartyIds: flip?.includedAppellantPartyIds,
            includedOpponentPartyIds,
        },
    );

    const sourceIndex = hopIndex;
    if (updatedStages[sourceIndex] && (input.objectorPartyIds?.length || updatedStages[sourceIndex].partyChallengeLanes)) {
        const withLanes = attachPartyChallengeLanes(updatedStages[sourceIndex], {
            existing: sourceStage.partyChallengeLanes,
            dispositions: sourceStage.partyJudgmentDispositions,
            judgmentDate: sourceStage.decisionDate,
            integrity: sourceStage.disputeIntegrity,
            today: input.filingDate,
        });
        updatedStages[sourceIndex] = {
            ...withLanes,
            partyChallengeLanes: markLanesState(
                withLanes.partyChallengeLanes,
                input.objectorPartyIds ?? [],
                LANE_STATE_OBJECTION,
            ),
        };
    }

    const sessionDate = String(input.sessionDate ?? '').trim();
    let sessionEventId: string | undefined;
    if (sessionDate) {
        const newStage = updatedStages[newActiveIndex];
        sessionEventId = `appt_obj_${Date.now()}`;
        const sessionEvent: TimelineEvent = {
            id: sessionEventId,
            type: 'appointment',
            date: sessionDate,
            title: 'جلسة مرافعة (اعتراض غيابي)',
            details: 'نظر الاعتراض الغيابي',
            isNew: true,
        };
        updatedStages[newActiveIndex] = {
            ...newStage,
            timeline: [sessionEvent, ...(newStage.timeline ?? [])],
        };
    }

    return { updatedStages, newActiveIndex, resolvedCaseNumber, sessionEventId };
}
