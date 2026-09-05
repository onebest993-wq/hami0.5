/**
 * المادة 210 مرافعات — ميعاد التمييز الفردي وامتداد أثر النقض للشركاء.
 * التمييز/الاستئناف ليسا غيابيَين؛ الغياب يبقى على بطاقات البداءة.
 */
import {
    isDisputeIndivisible,
    JUDGMENT_FORM_GHIABI,
    releasedPartyIds,
    type DisputeIntegrity,
} from './partyJudgmentDisposition';
import {
    LANE_STATE_CASSATION,
    LANE_STATE_LAPSED,
    LANE_STATE_LAPSED_EXECUTABLE,
    LANE_STATE_OBJECTION,
    LANE_STATE_REVIVED_BY_CASSATION_EXTENSION,
    LANE_STATE_WAIVED,
    normalizePartyChallengeLanes,
    type PartyChallengeLane,
} from './partyChallengeLanes';

export const CASSATION_JUDGMENT_AFFIRMED = 'تصديق الحكم';
export const CASSATION_JUDGMENT_REMANDED = 'نقض الحكم وإعادة الإضبارة';
export const CASSATION_JUDGMENT_REVERSE_FINAL = 'نقض الحكم والفصل في الموضوع';
export const CASSATION_JUDGMENT_DISMISS_FORMAL = 'رد الطعن التمييزي شكلاً';

export type CassationJudgmentEffect =
    | 'AFFIRMED'
    | 'REVERSED_REMANDED'
    | 'REVERSED_FINAL'
    | 'DISMISS_FORMAL';

export type CassationGroundsScope = 'COMMON' | 'PERSONAL';

export const ART210_EXTENSION_NOTICE =
    'استفاد الشركاء من نقض القرار حكماً لوحدة النزاع عملاً بالمادة 210 مرافعات';

export const DIRECT_CASSATION_BLOCKED_MESSAGE =
    'لا يُقبل التمييز المباشر للحكم الغيابي قبل التبليغ أو ما دامت مهلة الاعتراض قائمة إلا بعد ترك الاعتراض';

export function isCassationAppealMethod(appealType?: string | null): boolean {
    const t = String(appealType ?? '').trim();
    if (!t || t.includes('تصحيح') || t.includes('استئناف')) return false;
    return t === 'تمييز' || t === 'التمييز';
}

export function parseCassationGroundsScope(raw: unknown): CassationGroundsScope {
    return String(raw ?? '').trim() === 'PERSONAL' ? 'PERSONAL' : 'COMMON';
}

export function classifyCassationJudgmentEffect(raw: unknown): CassationJudgmentEffect | null {
    const t = String(raw ?? '').trim();
    if (!t) return null;
    if (t === CASSATION_JUDGMENT_REVERSE_FINAL || (t.includes('نقض') && t.includes('الموضوع'))) {
        return 'REVERSED_FINAL';
    }
    if (t === CASSATION_JUDGMENT_REMANDED || (t.includes('نقض') && t.includes('إعادة'))) {
        return 'REVERSED_REMANDED';
    }
    if (t === CASSATION_JUDGMENT_AFFIRMED || t.includes('تصديق')) return 'AFFIRMED';
    if (t.includes('رد') && t.includes('شكل')) return 'DISMISS_FORMAL';
    return null;
}

function deadlinePassed(deadline: string | null | undefined, today: string): boolean {
    const d = String(deadline ?? '').trim().slice(0, 10);
    if (!d) return false;
    return today > d;
}

/**
 * تمييز مباشر من البداءة: الغائب لا يميّز ما دامت مهلة اعتراضه قائمة، إلا بعد التنازل.
 * بعد الاستئناف لا يُستدعى هذا القيد (حكم الاستئناف حضوري).
 */
export function canPartyFileDirectCassation(
    lane: PartyChallengeLane,
    todayYmd: string,
): boolean {
    const today = String(todayYmd ?? '').trim().slice(0, 10);
    if (lane.laneState === LANE_STATE_OBJECTION) return false;
    if (lane.disposition === JUDGMENT_FORM_GHIABI) {
        if (!lane.servedAt) return false;
        if (
            lane.laneState !== LANE_STATE_WAIVED
            && lane.objectionDeadline
            && !deadlinePassed(lane.objectionDeadline, today)
        ) {
            return false;
        }
    }
    if (lane.cassationDeadline && deadlinePassed(lane.cassationDeadline, today)) return false;
    return true;
}

export function listBlockedDirectCassationPartyIds(params: {
    lanes?: unknown;
    partyIds?: Array<number | string> | null;
    today: string;
}): string[] {
    const wanted = new Set(
        (params.partyIds ?? []).map((id) => String(id ?? '').trim()).filter(Boolean),
    );
    if (wanted.size === 0) return [];
    return normalizePartyChallengeLanes(params.lanes)
        .filter((lane) => wanted.has(lane.partyId) && !canPartyFileDirectCassation(lane, params.today))
        .map((lane) => lane.partyId);
}

const REVIVABLE_STATES = new Set([
    LANE_STATE_LAPSED,
    LANE_STATE_LAPSED_EXECUTABLE,
    LANE_STATE_WAIVED,
]);

export function applyArt210CassationExtension(params: {
    lanes?: unknown;
    integrity?: DisputeIntegrity | string | null;
    groundsScope?: CassationGroundsScope | string | null;
    cassatorPartyIds?: Array<number | string> | null;
    effect?: CassationJudgmentEffect | string | null;
    /** صفوف التفريد — المبرأون لا يُحيَون بم/210 */
    dispositions?: unknown;
}): PartyChallengeLane[] {
    const lanes = normalizePartyChallengeLanes(params.lanes);
    const effect =
        params.effect === 'REVERSED_REMANDED'
        || classifyCassationJudgmentEffect(params.effect) === 'REVERSED_REMANDED'
            ? 'REVERSED_REMANDED'
            : params.effect;
    if (effect !== 'REVERSED_REMANDED') return lanes;
    if (parseCassationGroundsScope(params.groundsScope) !== 'COMMON') return lanes;
    if (!isDisputeIndivisible(params.integrity)) return lanes;
    const cassators = new Set(
        (params.cassatorPartyIds ?? []).map((id) => String(id ?? '').trim()).filter(Boolean),
    );
    const released = new Set(releasedPartyIds(params.dispositions));
    return lanes.map((lane) => {
        if (cassators.has(lane.partyId)) return lane;
        if (released.has(lane.partyId)) return lane;
        if (lane.laneState === LANE_STATE_CASSATION) return lane;
        if (!REVIVABLE_STATES.has(lane.laneState)) return lane;
        return { ...lane, laneState: LANE_STATE_REVIVED_BY_CASSATION_EXTENSION };
    });
}

export function hasArt210ExtensionLanes(raw: unknown): boolean {
    return normalizePartyChallengeLanes(raw).some(
        (lane) => lane.laneState === LANE_STATE_REVIVED_BY_CASSATION_EXTENSION,
    );
}
