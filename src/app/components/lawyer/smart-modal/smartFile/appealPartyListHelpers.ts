import type { IncidentalCase, Party } from '../../LawyerShared';
import {
    affiliativeThirdPartySide,
    isAffiliativeThirdPartyRole,
    isDefendantSideRole,
    isInterpleaderThirdPartyRole,
    isPlaintiffSideRole,
    isThirdPartyRole,
    resolveAbsentObjectionOriginalSide,
} from './partyRoleClassification';

export type AppealSide = 'المدعي' | 'المدعى عليه';

/** Legacy modals emit string ids; stage parties keep numeric Party.id. */
export function normalizePartyIdKey(id: number | string | null | undefined): string {
    return String(id ?? '').trim();
}

export function partyIdInList(
    ids: Array<number | string>,
    partyId: number | string | null | undefined,
): boolean {
    const key = normalizePartyIdKey(partyId);
    return ids.some((id) => normalizePartyIdKey(id) === key);
}

function findIncidentalForParty(party: Party, incidentalCases?: IncidentalCase[]): IncidentalCase | undefined {
    if (!Array.isArray(incidentalCases)) return undefined;
    const name = String(party.name ?? '').trim();
    return incidentalCases.find(
        (c) =>
            c.type === 'thirdParty'
            && c.status === 'active'
            && c.entryDecision !== 'rejected'
            && String(c.partyName ?? '').trim() === name,
    );
}

export function partyBelongsToAppealSide(
    party: Party,
    side: AppealSide,
    incidentalCases?: IncidentalCase[],
): boolean {
    if (isThirdPartyRole(party.role)) {
        const inc = findIncidentalForParty(party, incidentalCases);
        const affiliative =
            inc?.thirdPartyEntryMode === 'affiliative'
            || isAffiliativeThirdPartyRole(String(party.role ?? ''));
        if (affiliative) {
            const affSide =
                inc?.affiliationSide === 'plaintiff'
                    ? 'plaintiff'
                    : inc?.affiliationSide === 'defendant'
                      ? 'defendant'
                      : affiliativeThirdPartySide(String(party.role ?? ''), party.side);
            const withPlaintiff = affSide === 'plaintiff';
            return side === 'المدعي' ? withPlaintiff : !withPlaintiff;
        }
        return false;
    }
    const originalSide = resolveAbsentObjectionOriginalSide(party);
    if (originalSide) return side === originalSide;
    if (side === 'المدعي') return isPlaintiffSideRole(party.role);
    return isDefendantSideRole(party.role);
}

export function listAppellantPartiesForAppeal(
    parties: Party[],
    appellantSide: AppealSide,
    incidentalCases?: IncidentalCase[],
): Party[] {
    return parties.filter((p) => partyBelongsToAppealSide(p, appellantSide, incidentalCases));
}

export function listOpponentPartiesForAppeal(
    parties: Party[],
    appellantSide: AppealSide,
    incidentalCases?: IncidentalCase[],
): Party[] {
    const opponentSide: AppealSide = appellantSide === 'المدعي' ? 'المدعى عليه' : 'المدعي';
    return parties.filter((p) => partyBelongsToAppealSide(p, opponentSide, incidentalCases));
}

export function defaultIncludedAppellantIds(
    parties: Party[],
    appellantSide: AppealSide,
    incidentalCases?: IncidentalCase[],
): Array<number | string> {
    return listAppellantPartiesForAppeal(parties, appellantSide, incidentalCases).map((p) => p.id);
}

export function defaultIncludedOpponentIds(
    parties: Party[],
    appellantSide: AppealSide,
    incidentalCases?: IncidentalCase[],
): Array<number | string> {
    return listOpponentPartiesForAppeal(parties, appellantSide, incidentalCases).map((p) => p.id);
}

export function inferAppellantSideFromSelectedParties(
    parties: Party[] | null | undefined,
    appellantIds: Array<number | string>,
): AppealSide {
    const keys = new Set(appellantIds.map(normalizePartyIdKey).filter(Boolean));
    const selected = (parties ?? []).filter((party) => keys.has(normalizePartyIdKey(party.id)));
    if (
        selected.length > 0
        && selected.every((party) => isInterpleaderThirdPartyRole(String(party.role ?? '')))
    ) {
        return 'المدعي';
    }
    const originalSides = selected
        .map((party) => resolveAbsentObjectionOriginalSide(party))
        .filter((side): side is AppealSide => side === 'المدعي' || side === 'المدعى عليه');
    if (originalSides.length > 0 && originalSides.every((side) => side === originalSides[0])) {
        return originalSides[0]!;
    }
    if (
        selected.length > 0
        && selected.every((party) => isDefendantSideRole(String(party.role ?? '')))
    ) {
        return 'المدعى عليه';
    }
    return 'المدعي';
}

/**
 * خصوم الطعن = الجانب الأصلي المقابل فقط.
 * شركاء الطاعن في نفس الجبهة لا يُقلَبون مستأنفاً عليهم / معترضاً عليهم.
 * الطعن من اختصامي يجوز مخاصمة الطرفين الأصليين.
 */
export function resolveSelectedOpponentPartyIds(
    parties: Party[] | null | undefined,
    appellantIds: Array<number | string>,
    explicitOpponentIds?: Array<number | string> | null,
    incidentalCases?: IncidentalCase[],
): Array<number | string> {
    const list = parties ?? [];
    const appellantKeys = new Set(appellantIds.map(normalizePartyIdKey).filter(Boolean));
    const selected = list.filter((party) => appellantKeys.has(normalizePartyIdKey(party.id)));
    const interpleaderHop =
        selected.length > 0
        && selected.every((party) => isInterpleaderThirdPartyRole(String(party.role ?? '')));
    if (interpleaderHop) {
        const leftover = list
            .filter((party) => !appellantKeys.has(normalizePartyIdKey(party.id)))
            .map((party) => party.id);
        if (!explicitOpponentIds?.length) return leftover;
        return explicitOpponentIds.filter((id) => !appellantKeys.has(normalizePartyIdKey(id)));
    }
    const side = inferAppellantSideFromSelectedParties(list, appellantIds);
    const opposite = defaultIncludedOpponentIds(list, side, incidentalCases);
    const sameSide = new Set(
        defaultIncludedAppellantIds(list, side, incidentalCases).map(normalizePartyIdKey),
    );
    if (!explicitOpponentIds?.length) return opposite;
    const picked = explicitOpponentIds.filter((id) => !sameSide.has(normalizePartyIdKey(id)));
    return picked.length > 0 ? picked : opposite;
}
