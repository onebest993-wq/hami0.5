/**
 * بطاقات الطعن الفردية — تتبع التبليغ والمهل لكل خصم دون فتح مراحل متوازية.
 * السيادة للموكل: المرحلة النشطة تتبع موكل الإضبارة؛ الشركاء/الخصوم على هذه البطاقات.
 */
import { addDaysToLocalYmd } from '@/app/utils/localYmd';
import {
    JUDGMENT_FORM_GHIABI,
    isDisputeIndivisible,
    isJudgmentPresenceForm,
    isPartyOperativeReleased,
    isPresentLikeJudgmentForm,
    listJudgmentDispositionDefendants,
    normalizePartyJudgmentDispositions,
    partyDispositionId,
    resolveClientDefendantJudgmentForm,
    seedPartyJudgmentDispositions,
    type DisputeIntegrity,
    type JudgmentPresenceForm,
    type PartyJudgmentDisposition,
} from './partyJudgmentDisposition';
import type { LawsuitPartyRoleRecord } from './lawsuitPartyRole';

export const LANE_STATE_PENDING = 'pending';
export const LANE_STATE_OBJECTION = 'objection';
export const LANE_STATE_APPEAL = 'appeal';
export const LANE_STATE_CASSATION = 'cassation';
export const LANE_STATE_WAIVED = 'waived';
export const LANE_STATE_LAPSED = 'lapsed';
export const LANE_STATE_LAPSED_EXECUTABLE = 'LAPSED_EXECUTABLE';
export const LANE_STATE_REVIVED_BY_CASSATION_EXTENSION = 'REVIVED_BY_CASSATION_EXTENSION';

export type PartyChallengeLaneState =
    | typeof LANE_STATE_PENDING
    | typeof LANE_STATE_OBJECTION
    | typeof LANE_STATE_APPEAL
    | typeof LANE_STATE_CASSATION
    | typeof LANE_STATE_WAIVED
    | typeof LANE_STATE_LAPSED
    | typeof LANE_STATE_LAPSED_EXECUTABLE
    | typeof LANE_STATE_REVIVED_BY_CASSATION_EXTENSION;

export type PartyChallengeLane = {
    partyId: string;
    disposition: JudgmentPresenceForm;
    servedAt?: string | null;
    objectionDeadline?: string | null;
    appealDeadline?: string | null;
    cassationDeadline?: string | null;
    laneState: PartyChallengeLaneState;
};

const LANE_STATES = new Set<PartyChallengeLaneState>([
    LANE_STATE_PENDING,
    LANE_STATE_OBJECTION,
    LANE_STATE_APPEAL,
    LANE_STATE_CASSATION,
    LANE_STATE_WAIVED,
    LANE_STATE_LAPSED,
    LANE_STATE_LAPSED_EXECUTABLE,
    LANE_STATE_REVIVED_BY_CASSATION_EXTENSION,
]);

/** مهلة الاعتراض الغيابي: 10 أيام من تاريخ التبليغ الشخصي (نفس محرك التبليغ القائم). */
export const LANE_OBJECTION_DAYS = 10;
/** مهلة الاستئناف: 15 يوماً من اليوم التالي لصدور الحكم (حاضر/بمثابة) أو للتبليغ (غائب). */
export const LANE_APPEAL_DAYS = 15;

export function computeLaneObjectionDeadline(servedAtYmd: string): string {
    return addDaysToLocalYmd(String(servedAtYmd ?? '').trim().slice(0, 10), LANE_OBJECTION_DAYS);
}

export function computeLaneAppealDeadlineFromService(servedAtYmd: string): string {
    const base = String(servedAtYmd ?? '').trim().slice(0, 10);
    const dayAfter = addDaysToLocalYmd(base, 1);
    return addDaysToLocalYmd(dayAfter, LANE_APPEAL_DAYS);
}

export function computeLaneAppealDeadlineFromJudgment(judgmentDateYmd: string): string {
    const base = String(judgmentDateYmd ?? '').trim().slice(0, 10);
    const dayAfter = addDaysToLocalYmd(base, 1);
    return addDaysToLocalYmd(dayAfter, LANE_APPEAL_DAYS);
}

/** مهلة التمييز: 30 يوماً من اليوم التالي للتبليغ الفعلي (م/210 — تمييز مباشر من البداءة). */
export const LANE_CASSATION_DAYS = 30;

export function computeLaneCassationDeadlineFromService(servedAtYmd: string): string {
    const base = String(servedAtYmd ?? '').trim().slice(0, 10);
    const dayAfter = addDaysToLocalYmd(base, 1);
    return addDaysToLocalYmd(dayAfter, LANE_CASSATION_DAYS);
}

export function computeLaneCassationDeadlineFromJudgment(judgmentDateYmd: string): string {
    const base = String(judgmentDateYmd ?? '').trim().slice(0, 10);
    const dayAfter = addDaysToLocalYmd(base, 1);
    return addDaysToLocalYmd(dayAfter, LANE_CASSATION_DAYS);
}

function parseLaneState(raw: unknown): PartyChallengeLaneState | null {
    const t = String(raw ?? '').trim();
    return LANE_STATES.has(t as PartyChallengeLaneState) ? (t as PartyChallengeLaneState) : null;
}

function ymdOrNull(raw: unknown): string | null {
    const t = String(raw ?? '').trim().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

export function normalizePartyChallengeLanes(raw: unknown): PartyChallengeLane[] {
    if (!Array.isArray(raw)) return [];
    const out: PartyChallengeLane[] = [];
    const seen = new Set<string>();
    for (const row of raw) {
        if (!row || typeof row !== 'object') continue;
        const rec = row as Record<string, unknown>;
        const partyId = String(rec.partyId ?? '').trim();
        if (!partyId || seen.has(partyId) || !isJudgmentPresenceForm(rec.disposition)) continue;
        const laneState = parseLaneState(rec.laneState) ?? LANE_STATE_PENDING;
        seen.add(partyId);
        out.push({
            partyId,
            disposition: rec.disposition,
            servedAt: ymdOrNull(rec.servedAt),
            objectionDeadline: ymdOrNull(rec.objectionDeadline),
            appealDeadline: ymdOrNull(rec.appealDeadline),
            cassationDeadline: ymdOrNull(rec.cassationDeadline),
            laneState,
        });
    }
    return out;
}

function seedLaneFromDisposition(
    partyId: string,
    form: JudgmentPresenceForm,
    existing: PartyChallengeLane | undefined,
    judgmentDate: string,
    released = false,
): PartyChallengeLane {
    if (released) {
        return {
            partyId,
            disposition: form,
            servedAt: existing?.servedAt ?? null,
            objectionDeadline: null,
            appealDeadline: null,
            cassationDeadline: null,
            laneState: LANE_STATE_WAIVED,
        };
    }
    const servedAt = existing?.servedAt ?? null;
    const present = isPresentLikeJudgmentForm(form);
    const appealFromJudgment = judgmentDate ? computeLaneAppealDeadlineFromJudgment(judgmentDate) : null;
    const cassationFromJudgment = judgmentDate ? computeLaneCassationDeadlineFromJudgment(judgmentDate) : null;
    return {
        partyId,
        disposition: form,
        servedAt,
        objectionDeadline:
            form === JUDGMENT_FORM_GHIABI
                ? (servedAt ? computeLaneObjectionDeadline(servedAt) : existing?.objectionDeadline ?? null)
                : null,
        appealDeadline: present
            ? (existing?.appealDeadline || appealFromJudgment)
            : servedAt
              ? computeLaneAppealDeadlineFromService(servedAt)
              : existing?.appealDeadline ?? null,
        cassationDeadline: present
            ? (existing?.cassationDeadline || cassationFromJudgment)
            : servedAt
              ? computeLaneCassationDeadlineFromService(servedAt)
              : existing?.cassationDeadline ?? null,
        laneState: existing?.laneState ?? LANE_STATE_PENDING,
    };
}

export function isScalarGhayabiJudgmentForm(raw?: string | null): boolean {
    const t = String(raw ?? '').trim();
    if (!t || t.includes('مختلط')) return false;
    return t === JUDGMENT_FORM_GHIABI || t.startsWith(JUDGMENT_FORM_GHIABI);
}

export function mergePartyChallengeLanes(params: {
    parties?: Array<LawsuitPartyRoleRecord & { name?: unknown; isClient?: boolean }> | null;
    dispositions?: PartyJudgmentDisposition[] | unknown;
    existing?: unknown;
    judgmentDate?: string | null;
    integrity?: DisputeIntegrity | string | null;
    today?: string | null;
    judgmentForm?: string | null;
}): PartyChallengeLane[] {
    const defendants = listJudgmentDispositionDefendants(params.parties ?? []);
    let dispositions = normalizePartyJudgmentDispositions(params.dispositions);
    if (dispositions.length === 0 && isScalarGhayabiJudgmentForm(params.judgmentForm)) {
        dispositions = seedPartyJudgmentDispositions(defendants, JUDGMENT_FORM_GHIABI);
    }
    const byDisposition = new Map(dispositions.map((row) => [row.partyId, row]));
    const existingById = new Map(
        normalizePartyChallengeLanes(params.existing).map((lane) => [lane.partyId, lane]),
    );
    const judgmentDate = String(params.judgmentDate ?? '').trim().slice(0, 10);
    const merged: PartyChallengeLane[] = [];
    const seen = new Set<string>();
    for (const party of defendants) {
        const partyId = partyDispositionId(party);
        if (!partyId || seen.has(partyId)) continue;
        seen.add(partyId);
        const row = byDisposition.get(partyId);
        const form = row?.form ?? existingById.get(partyId)?.disposition;
        if (!form) continue;
        merged.push(
            seedLaneFromDisposition(
                partyId,
                form,
                existingById.get(partyId),
                judgmentDate,
                isPartyOperativeReleased(row),
            ),
        );
    }
    if (merged.length === 0) {
        for (const row of dispositions) {
            if (seen.has(row.partyId)) continue;
            seen.add(row.partyId);
            merged.push(
                seedLaneFromDisposition(
                    row.partyId,
                    row.form,
                    existingById.get(row.partyId),
                    judgmentDate,
                    isPartyOperativeReleased(row),
                ),
            );
        }
    }
    return applySeverableLaneLapses(merged, params.integrity, params.today);
}

function deadlinePassed(deadline: string | null | undefined, today: string): boolean {
    const d = String(deadline ?? '').trim().slice(0, 10);
    if (!d) return false;
    return today > d;
}

export function applySeverableLaneLapses(
    lanes: PartyChallengeLane[],
    integrity?: DisputeIntegrity | string | null,
    todayYmd?: string | null,
): PartyChallengeLane[] {
    const today = String(todayYmd ?? '').trim().slice(0, 10);
    if (!today) return lanes;
    const executable = !isDisputeIndivisible(integrity);
    return lanes.map((lane) => {
        if (
            lane.laneState !== LANE_STATE_PENDING
            && lane.laneState !== LANE_STATE_LAPSED
            && lane.laneState !== LANE_STATE_LAPSED_EXECUTABLE
        ) {
            return lane;
        }
        const objectionOpen = lane.disposition === JUDGMENT_FORM_GHIABI && !deadlinePassed(lane.objectionDeadline, today);
        const appealOpen = !deadlinePassed(lane.appealDeadline, today);
        const cassationOpen = Boolean(lane.cassationDeadline) && !deadlinePassed(lane.cassationDeadline, today);
        const stillOpen =
            (lane.disposition === JUDGMENT_FORM_GHIABI && !lane.servedAt)
            || objectionOpen
            || appealOpen
            || cassationOpen;
        if (stillOpen) {
            if (
                lane.laneState === LANE_STATE_LAPSED
                || lane.laneState === LANE_STATE_LAPSED_EXECUTABLE
            ) {
                return { ...lane, laneState: LANE_STATE_PENDING };
            }
            return lane;
        }
        if (!lane.appealDeadline && lane.disposition === JUDGMENT_FORM_GHIABI) return lane;
        if (!lane.appealDeadline && isPresentLikeJudgmentForm(lane.disposition)) return lane;
        return {
            ...lane,
            laneState: executable ? LANE_STATE_LAPSED_EXECUTABLE : LANE_STATE_LAPSED,
        };
    });
}

export function isGhayabiJoinableLane(
    lane: PartyChallengeLane,
    todayYmd: string,
): boolean {
    if (lane.disposition !== JUDGMENT_FORM_GHIABI) return false;
    if (lane.laneState !== LANE_STATE_PENDING) return false;
    const servedAt = String(lane.servedAt ?? '').trim().slice(0, 10);
    if (!servedAt) return false;
    const deadline = lane.objectionDeadline || computeLaneObjectionDeadline(servedAt);
    if (!deadline) return false;
    return !deadlinePassed(deadline, todayYmd);
}

export function hasRegisteredObjectionLane(raw: unknown): boolean {
    return normalizePartyChallengeLanes(raw).some((lane) => lane.laneState === LANE_STATE_OBJECTION);
}

export function hasUnservedGhayabiLane(raw: unknown): boolean {
    return normalizePartyChallengeLanes(raw).some(
        (lane) =>
            lane.disposition === JUDGMENT_FORM_GHIABI
            && !lane.servedAt
            && lane.laneState !== LANE_STATE_OBJECTION
            && lane.laneState !== LANE_STATE_APPEAL
            && lane.laneState !== LANE_STATE_CASSATION
            && lane.laneState !== LANE_STATE_WAIVED
            && lane.laneState !== LANE_STATE_LAPSED
            && lane.laneState !== LANE_STATE_LAPSED_EXECUTABLE
            && lane.laneState !== LANE_STATE_REVIVED_BY_CASSATION_EXTENSION,
    );
}

export function listUnservedGhayabiNoticeOptions(params: {
    parties?: Array<LawsuitPartyRoleRecord & { name?: unknown }> | null;
    dispositions?: unknown;
    lanes?: unknown;
    judgmentForm?: string | null;
}): Array<{ partyId: string; name: string }> {
    const lanes = normalizePartyChallengeLanes(params.lanes);
    let dispositions = normalizePartyJudgmentDispositions(params.dispositions);
    if (dispositions.length === 0 && isScalarGhayabiJudgmentForm(params.judgmentForm)) {
        dispositions = seedPartyJudgmentDispositions(
            listJudgmentDispositionDefendants(params.parties ?? []),
            JUDGMENT_FORM_GHIABI,
        );
    }
    const sourceIds =
        lanes.length > 0
            ? lanes
                  .filter((lane) => lane.disposition === JUDGMENT_FORM_GHIABI && !lane.servedAt)
                  .filter(
                      (lane) =>
                          lane.laneState !== LANE_STATE_OBJECTION
                          && lane.laneState !== LANE_STATE_APPEAL
                          && lane.laneState !== LANE_STATE_CASSATION
                          && lane.laneState !== LANE_STATE_WAIVED
                          && lane.laneState !== LANE_STATE_LAPSED
                          && lane.laneState !== LANE_STATE_LAPSED_EXECUTABLE
                          && lane.laneState !== LANE_STATE_REVIVED_BY_CASSATION_EXTENSION,
                  )
                  .map((lane) => lane.partyId)
            : dispositions.filter((row) => row.form === JUDGMENT_FORM_GHIABI).map((row) => row.partyId);
    const ghayabiIds: string[] = [];
    for (const partyId of sourceIds) {
        if (!ghayabiIds.includes(partyId)) ghayabiIds.push(partyId);
    }
    const byId = new Map(
        (params.parties ?? []).map((party) => [partyDispositionId(party), String(party.name ?? '').trim()]),
    );
    return ghayabiIds.map((partyId) => ({
        partyId,
        name: byId.get(partyId) || `طرف ${partyId}`,
    }));
}

export function markLanesServed(
    raw: unknown,
    partyIds: Array<number | string>,
    servedAtYmd: string,
): PartyChallengeLane[] {
    const ids = new Set(partyIds.map((id) => String(id ?? '').trim()).filter(Boolean));
    const servedAt = String(servedAtYmd ?? '').trim().slice(0, 10);
    if (ids.size === 0) return normalizePartyChallengeLanes(raw);
    return normalizePartyChallengeLanes(raw).map((lane) => {
        if (!ids.has(lane.partyId) || lane.disposition !== JUDGMENT_FORM_GHIABI) return lane;
        return {
            ...lane,
            servedAt,
            objectionDeadline: computeLaneObjectionDeadline(servedAt),
            appealDeadline: computeLaneAppealDeadlineFromService(servedAt),
            cassationDeadline: computeLaneCassationDeadlineFromService(servedAt),
        };
    });
}

export function markLaneServed(
    raw: unknown,
    partyId: string,
    servedAtYmd: string,
): PartyChallengeLane[] {
    return markLanesServed(raw, [partyId], servedAtYmd);
}

export function markLanesState(
    raw: unknown,
    partyIds: Array<number | string>,
    laneState: PartyChallengeLaneState,
): PartyChallengeLane[] {
    const ids = new Set(partyIds.map((id) => String(id ?? '').trim()).filter(Boolean));
    return normalizePartyChallengeLanes(raw).map((lane) =>
        ids.has(lane.partyId) ? { ...lane, laneState } : lane,
    );
}

export function resolveGhayabiObjectorPartyIds(params: {
    parties?: Array<LawsuitPartyRoleRecord & { isClient?: boolean }> | null;
    dispositions?: unknown;
    explicitIds?: Array<number | string> | null;
    preferClient?: boolean;
}): string[] {
    const dispositions = normalizePartyJudgmentDispositions(params.dispositions);
    const ghayabi = dispositions
        .filter((row) => row.form === JUDGMENT_FORM_GHIABI)
        .map((row) => row.partyId);
    const explicit = (params.explicitIds ?? [])
        .map((id) => String(id ?? '').trim())
        .filter(Boolean);
    if (explicit.length > 0) {
        const filtered = explicit.filter((id) => ghayabi.length === 0 || ghayabi.includes(id));
        return filtered.length > 0 ? filtered : explicit;
    }
    if (params.preferClient) {
        const clientForm = resolveClientDefendantJudgmentForm(params.parties, dispositions);
        if (clientForm !== JUDGMENT_FORM_GHIABI) return [];
        const clients = listJudgmentDispositionDefendants(params.parties ?? []).filter((party) =>
            Boolean(party.isClient),
        );
        return clients
            .map((party) => partyDispositionId(party))
            .filter((id) => ghayabi.includes(id));
    }
    return ghayabi.length === 1 ? ghayabi : [];
}

export function resolveAbsentObjectionFlipSelection(objectorPartyIds: Array<number | string>): {
    includedAppellantPartyIds: Array<number | string>;
} | undefined {
    const ids = objectorPartyIds.map((id) => String(id ?? '').trim()).filter(Boolean);
    if (ids.length === 0) return undefined;
    return { includedAppellantPartyIds: ids };
}

export function missingCompulsoryJoinderIds(
    requiredIds: Array<number | string> | undefined,
    selectedIds: Array<number | string> | undefined,
): string[] {
    const selected = new Set(
        (selectedIds ?? []).map((id) => String(id ?? '').trim()).filter(Boolean),
    );
    return (requiredIds ?? [])
        .map((id) => String(id ?? '').trim())
        .filter((id) => Boolean(id) && !selected.has(id));
}

export function attachPartyChallengeLanes<T extends {
    parties?: Array<LawsuitPartyRoleRecord & { name?: unknown; isClient?: boolean }> | null;
    partyJudgmentDispositions?: unknown;
    partyChallengeLanes?: unknown;
    decisionDate?: string | null;
    disputeIntegrity?: DisputeIntegrity | string | null;
    judgmentForm?: string | null;
}>(
    stage: T,
    extras?: {
        dispositions?: unknown;
        existing?: unknown;
        judgmentDate?: string | null;
        integrity?: DisputeIntegrity | string | null;
        today?: string | null;
        judgmentForm?: string | null;
    },
): T {
    const lanes = mergePartyChallengeLanes({
        parties: stage.parties,
        dispositions: extras?.dispositions ?? stage.partyJudgmentDispositions,
        existing: extras?.existing ?? stage.partyChallengeLanes,
        judgmentDate: extras?.judgmentDate ?? stage.decisionDate,
        integrity: extras?.integrity ?? stage.disputeIntegrity,
        today: extras?.today,
        judgmentForm: extras?.judgmentForm ?? stage.judgmentForm,
    });
    if (lanes.length === 0) return stage;
    return { ...stage, partyChallengeLanes: lanes };
}

export type PartyChallengeLaneRadarRow = {
    partyId: string;
    name: string;
    disposition: JudgmentPresenceForm;
    laneState: PartyChallengeLaneState;
    summary: string;
};

function formatLaneRadarSummary(lane: PartyChallengeLane): string {
    if (lane.laneState === LANE_STATE_OBJECTION) return 'قيد الاعتراض الغيابي';
    if (lane.disposition === JUDGMENT_FORM_GHIABI && lane.laneState === LANE_STATE_APPEAL) {
        return 'تنازل عن الاعتراض وطعن استئنافاً';
    }
    if (lane.laneState === LANE_STATE_APPEAL) return 'استئناف مسجّل';
    if (lane.laneState === LANE_STATE_CASSATION) return 'تمييز مسجّل';
    if (lane.laneState === LANE_STATE_REVIVED_BY_CASSATION_EXTENSION) {
        return 'مستفيد من النقض (م/210)';
    }
    if (lane.laneState === LANE_STATE_WAIVED) return 'تنازل عن الاعتراض وطعن استئنافاً';
    if (lane.laneState === LANE_STATE_LAPSED_EXECUTABLE) return 'سقوط الحق بالطعن';
    if (lane.laneState === LANE_STATE_LAPSED) return 'سقوط الحق بالطعن';
    if (lane.disposition === JUDGMENT_FORM_GHIABI && !lane.servedAt) return 'بانتظار التبليغ';
    if (lane.disposition === JUDGMENT_FORM_GHIABI) {
        const objection = lane.objectionDeadline ? `اعتراض حتى ${lane.objectionDeadline}` : '';
        const appeal = lane.appealDeadline ? `استئناف حتى ${lane.appealDeadline}` : '';
        const cassation = lane.cassationDeadline ? `تمييز حتى ${lane.cassationDeadline}` : '';
        return [objection, appeal, cassation].filter(Boolean).join(' — ') || 'مهلة الطعن مفتوحة';
    }
    const appeal = lane.appealDeadline ? `استئناف حتى ${lane.appealDeadline}` : '';
    const cassation = lane.cassationDeadline ? `تمييز حتى ${lane.cassationDeadline}` : '';
    return [appeal, cassation].filter(Boolean).join(' — ') || 'مهلة الاستئناف مفتوحة';
}

export function listPartyChallengeLaneRadarRows(params: {
    parties?: Array<LawsuitPartyRoleRecord & { name?: unknown }> | null;
    dispositions?: unknown;
    lanes?: unknown;
    integrity?: DisputeIntegrity | string | null;
    judgmentDate?: string | null;
    today?: string | null;
}): PartyChallengeLaneRadarRow[] {
    const lanes = mergePartyChallengeLanes({
        parties: params.parties,
        dispositions: params.dispositions,
        existing: params.lanes,
        judgmentDate: params.judgmentDate,
        integrity: params.integrity,
        today: params.today,
    });
    const byId = new Map(
        (params.parties ?? []).map((party) => [partyDispositionId(party), String(party.name ?? '').trim()]),
    );
    return lanes.map((lane) => ({
        partyId: lane.partyId,
        name: byId.get(lane.partyId) || `طرف ${lane.partyId}`,
        disposition: lane.disposition,
        laneState: lane.laneState,
        summary: formatLaneRadarSummary(lane),
    }));
}
