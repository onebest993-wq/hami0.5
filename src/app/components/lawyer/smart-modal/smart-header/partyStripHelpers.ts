import type { Party } from '../../LawyerShared';
import {
    isAffiliativeThirdPartyRole,
    isAppealIntegratedInterpleaderRole,
    isInterpleaderThirdPartyRole,
} from '../smartFile/partyRoleClassification';

export function splitSideParties(parties: Party[]): Party[] {
    const main: Party[] = [];
    const affiliative: Party[] = [];
    const interpleader: Party[] = [];
    for (const party of parties) {
        const role = String(party.role ?? '');
        if (isAffiliativeThirdPartyRole(role)) affiliative.push(party);
        else if (isInterpleaderThirdPartyRole(role) && !isAppealIntegratedInterpleaderRole(role))
            interpleader.push(party);
        else main.push(party);
    }
    return [...main, ...affiliative, ...interpleader];
}

export type PartyAccent = 'emerald' | 'rose' | 'gold';

export interface PartySidePaneProps {
    label: string;
    labelClassName: string;
    accent: PartyAccent;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parties: any[];
    keyPrefix: string;
    openPartyKey: string | null;
    onToggleParty: (key: string) => void;
}
