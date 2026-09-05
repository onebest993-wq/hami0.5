/**
 * مسارا طعن الخصوم من حكم البداءة المختلط: استئناف الحاضر واعتراض الغائب.
 * المرحلة النشطة واحدة؛ المرحلتان تعيشان في الشريط. hop الثاني يُفتح من البداءة لا من الاستئناف.
 */
import {
    JUDGMENT_FORM_GHIABI,
    isPartyOperativeReleased,
    isPresentLikeJudgmentForm,
    normalizePartyJudgmentDispositions,
    resolveJudgmentPresenceWindows,
} from './partyJudgmentDisposition';
import {
    LANE_STATE_APPEAL,
    LANE_STATE_CASSATION,
    LANE_STATE_LAPSED,
    LANE_STATE_LAPSED_EXECUTABLE,
    LANE_STATE_OBJECTION,
    LANE_STATE_WAIVED,
    normalizePartyChallengeLanes,
    type PartyChallengeLane,
} from './partyChallengeLanes';

const CONSUMED_LANE = new Set<string>([
    LANE_STATE_OBJECTION,
    LANE_STATE_APPEAL,
    LANE_STATE_CASSATION,
    LANE_STATE_WAIVED,
    LANE_STATE_LAPSED,
    LANE_STATE_LAPSED_EXECUTABLE,
]);

function laneConsumed(lane: PartyChallengeLane): boolean {
    return CONSUMED_LANE.has(lane.laneState);
}

function dispositionReleasedSet(dispositions?: unknown): Set<string> {
    return new Set(
        normalizePartyJudgmentDispositions(dispositions)
            .filter(isPartyOperativeReleased)
            .map((row) => row.partyId),
    );
}

export function remainingGhayabiObjectionPartyIds(lanes: unknown, dispositions?: unknown): string[] {
    const released = dispositionReleasedSet(dispositions);
    const normalizedLanes = normalizePartyChallengeLanes(lanes);
    if (normalizedLanes.length > 0) {
        return normalizedLanes
            .filter(
                (lane) =>
                    lane.disposition === JUDGMENT_FORM_GHIABI
                    && !laneConsumed(lane)
                    && !released.has(lane.partyId),
            )
            .map((lane) => lane.partyId);
    }
    return normalizePartyJudgmentDispositions(dispositions)
        .filter((row) => row.form === JUDGMENT_FORM_GHIABI && !isPartyOperativeReleased(row))
        .map((row) => row.partyId);
}

export function remainingPresentAppealPartyIds(lanes: unknown, dispositions?: unknown): string[] {
    const released = dispositionReleasedSet(dispositions);
    const normalizedLanes = normalizePartyChallengeLanes(lanes);
    if (normalizedLanes.length > 0) {
        return normalizedLanes
            .filter(
                (lane) =>
                    isPresentLikeJudgmentForm(lane.disposition)
                    && !laneConsumed(lane)
                    && !released.has(lane.partyId),
            )
            .map((lane) => lane.partyId);
    }
    return normalizePartyJudgmentDispositions(dispositions)
        .filter((row) => isPresentLikeJudgmentForm(row.form) && !isPartyOperativeReleased(row))
        .map((row) => row.partyId);
}

export function firstInstanceHasMixedPresence(stage?: {
    judgmentForm?: string | null;
    lastJudgmentType?: string | null;
    partyJudgmentDispositions?: unknown;
} | null): boolean {
    if (!stage) return false;
    return resolveJudgmentPresenceWindows(
        normalizePartyJudgmentDispositions(stage.partyJudgmentDispositions),
        String(stage.judgmentForm ?? stage.lastJudgmentType ?? ''),
    ).mixed;
}

export function resolveRemainingOpponentChallengeMethods(params: {
    lanes?: unknown;
    dispositions?: unknown;
    /** @deprecated لم يعد يحجب المسار — الطعن يبقى حتى يستهلك كل مؤهل ليناه */
    hasObjectionStage?: boolean;
    /** @deprecated لم يعد يحجب المسار — الطعن يبقى حتى يستهلك كل مؤهل ليناه */
    hasAppealStageFromFirstInstance?: boolean;
}): string[] {
    void params.hasObjectionStage;
    void params.hasAppealStageFromFirstInstance;
    const methods: string[] = [];
    const objectionIds = remainingGhayabiObjectionPartyIds(params.lanes, params.dispositions);
    const presentAppealIds = remainingPresentAppealPartyIds(params.lanes, params.dispositions);
    /** أي غائب لم يستهلك حقه — يبقى زر الاعتراض حتى لو فُتحت اعتراضية لغيره */
    if (objectionIds.length > 0) {
        methods.push('اعتراض غيابي');
    }
    /** أي حاضر لم يطعن، أو غائب ما زال معلّقاً (يجوز استئناف/تمييز بدل الاعتراض) */
    if (presentAppealIds.length > 0 || objectionIds.length > 0) {
        methods.push('استئناف');
        methods.push('تمييز');
    }
    return methods;
}

export function hasRemainingOpponentChallengeTrack(params: {
    lanes?: unknown;
    dispositions?: unknown;
    hasObjectionStage?: boolean;
    hasAppealStageFromFirstInstance?: boolean;
}): boolean {
    return resolveRemainingOpponentChallengeMethods(params).length > 0;
}
