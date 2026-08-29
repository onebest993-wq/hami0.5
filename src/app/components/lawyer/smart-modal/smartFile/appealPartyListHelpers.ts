import type { IncidentalCase, Party } from '../../LawyerShared';
import {
    affiliativeThirdPartySide,
    isAffiliativeThirdPartyRole,
    isDefendantSideRole,
    isPlaintiffSideRole,
    isThirdPartyRole,
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
