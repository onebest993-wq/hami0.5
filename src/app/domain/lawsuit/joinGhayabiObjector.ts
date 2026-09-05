/**
 * ضم معترض غائب لاحق إلى مرحلة الاعتراض القائمة — بلا إضبارة جديدة.
 */
import {
    JUDGMENT_FORM_GHIABI,
    partyDispositionId,
} from './partyJudgmentDisposition';
import type { LawsuitPartyRoleRecord } from './lawsuitPartyRole';
import {
    isGhayabiJoinableLane,
    normalizePartyChallengeLanes,
} from './partyChallengeLanes';

export const JOIN_CO_OBJECTOR_LABEL = 'إضافة معترض آخر';
export const UNIFIED_OBJECTION_BANNER_PREFIX = 'اعتراض موحد — المعترضون:';

export type JoinableGhayabiObjector = {
    partyId: string;
    name: string;
};

export function listEligibleJoinableGhayabiObjectors(params: {
    lanes?: unknown;
    parties?: Array<LawsuitPartyRoleRecord & { name?: unknown }> | null;
    today: string;
}): JoinableGhayabiObjector[] {
    const today = String(params.today ?? '').trim().slice(0, 10);
    if (!today) return [];
    const byId = new Map(
        (params.parties ?? []).map((party) => [
            partyDispositionId(party),
            String(party.name ?? '').trim(),
        ]),
    );
    return normalizePartyChallengeLanes(params.lanes)
        .filter((lane) => isGhayabiJoinableLane(lane, today))
        .map((lane) => ({
            partyId: lane.partyId,
            name: byId.get(lane.partyId) || `طرف ${lane.partyId}`,
        }));
}

export function formatUnifiedObjectionBanner(names: string[]): string {
    const cleaned = names.map((name) => String(name ?? '').trim()).filter(Boolean);
    if (cleaned.length === 0) return '';
    return `${UNIFIED_OBJECTION_BANNER_PREFIX} ${cleaned.join(' و')}`;
}

export function canJoinGhayabiObjector(params: {
    lanes?: unknown;
    partyId: string;
    today: string;
}): boolean {
    const id = String(params.partyId ?? '').trim();
    if (!id) return false;
    const today = String(params.today ?? '').trim().slice(0, 10);
    return normalizePartyChallengeLanes(params.lanes).some(
        (lane) =>
            lane.partyId === id
            && lane.disposition === JUDGMENT_FORM_GHIABI
            && isGhayabiJoinableLane(lane, today),
    );
}
