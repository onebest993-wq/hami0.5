/**
 * أمانة الحكم البدائي بعد hop الاستئناف/التمييز.
 *
 * الاستئناف والتمييز ليسا غيابيَين إطلاقاً: لا تُنسخ صفات الغياب ولا بطاقات الطعن
 * إلى مرحلة الاستئناف كحكم صادر منها. شكل الحكم السابق يبقى في metadata فقط.
 */
import type { CaseStage } from '../../LawyerShared';
import {
    LANE_STATE_APPEAL,
    LANE_STATE_CASSATION,
    LANE_STATE_OBJECTION,
    attachPartyChallengeLanes,
    markLanesState,
    type PartyChallengeLaneState,
} from '@/app/domain/lawsuit/partyChallengeLanes';
import { isAppealStageName, isCassationStageName } from './judgmentStageNames';
import { isAbsentObjectionStageName } from './absentJudgmentStageNames';
import { findPriorFirstInstanceJudgmentIndex } from './art172AppealStay';
import { resolveStructuredJudgmentForm } from './judgmentStageMetadataTypes';

export function isAppealOrCassationStageName(stageName?: string | null): boolean {
    const name = String(stageName ?? '');
    return isAppealStageName(name) || isCassationStageName(name);
}

/** الاستئناف/التمييز لا يرثان صفة الغياب الحية من البداءة. */
export function shouldCarryFirstInstanceChallengeTruth(
    _sourceStageName?: string | null,
    _destStageName?: string | null,
): boolean {
    return false;
}

export function resolveChallengeTruthSource(
    stages: CaseStage[],
    currentStage: CaseStage,
    destStageName?: string | null,
): CaseStage {
    void destStageName;
    const sourceName = String(currentStage.stageName ?? currentStage.name ?? '');
    if (isAppealOrCassationStageName(sourceName)) {
        return currentStage;
    }
    const fiIndex = findPriorFirstInstanceJudgmentIndex(stages);
    if (fiIndex >= 0) {
        return stages[fiIndex] ?? currentStage;
    }
    return currentStage;
}

export function resolveHopPriorJudgmentForm(
    source: CaseStage,
    sourceStageName?: string | null,
): ReturnType<typeof resolveStructuredJudgmentForm> {
    if (isAppealOrCassationStageName(sourceStageName)) {
        return 'HADORI';
    }
    return resolveStructuredJudgmentForm(source);
}

/**
 * بعد hop الاستئناف/التمييز: وسم بطاقة الطاعن على البداءة المقفولة فقط.
 * hop الاستئناف→التمييز يسم بطاقات البداءة `cassation` دون نسخ الغياب إلى التمييز.
 */
export function overlayAppellantLanesAfterAppealHop(params: {
    stages: CaseStage[];
    sourceIndex: number;
    destIndex: number;
    appellantPartyIds: Array<number | string>;
    today: string;
}): CaseStage[] {
    const source = params.stages[params.sourceIndex];
    const dest = params.stages[params.destIndex];
    if (!source || !dest) return params.stages;
    const sourceName = String(source.stageName ?? source.name ?? '');
    const destName = String(dest.stageName ?? dest.name ?? '');
    if (!isAppealOrCassationStageName(destName) && !isAbsentObjectionStageName(destName)) {
        return params.stages;
    }
    if (isCassationStageName(sourceName)) return params.stages;
    if (isAppealStageName(destName) && isAppealOrCassationStageName(sourceName)) {
        return params.stages;
    }

    const fiIndex =
        isAppealOrCassationStageName(sourceName) || isAbsentObjectionStageName(sourceName)
            ? findPriorFirstInstanceJudgmentIndex(params.stages)
            : params.sourceIndex;
    if (fiIndex < 0) return params.stages;
    const firstInstance = params.stages[fiIndex];
    if (!firstInstance) return params.stages;

    const laneState: PartyChallengeLaneState = isAbsentObjectionStageName(destName)
        ? LANE_STATE_OBJECTION
        : isCassationStageName(destName)
          ? LANE_STATE_CASSATION
          : LANE_STATE_APPEAL;
    const withLanes = attachPartyChallengeLanes(firstInstance, {
        existing: firstInstance.partyChallengeLanes,
        dispositions: firstInstance.partyJudgmentDispositions,
        judgmentDate: firstInstance.decisionDate,
        integrity: firstInstance.disputeIntegrity,
        today: params.today,
    });
    const marked = markLanesState(
        withLanes.partyChallengeLanes,
        params.appellantPartyIds,
        laneState,
    );
    const next = [...params.stages];
    next[fiIndex] = { ...withLanes, partyChallengeLanes: marked };
    return next;
}
