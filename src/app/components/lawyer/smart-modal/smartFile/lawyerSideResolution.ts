import {
    extractParentheticalUnderlyingSide,
    isAbsentObjectedRole,
    isAbsentObjectorRole,
} from './partyRoleClassification';
import { resolveClientMarkedParty } from './clientMarkedParty';
import { resolveClientPartyBucket } from './clientPartyBucket';

/** يستنتج جانب الموكل من العلامة أو الإعدادات */
export function resolveLawyerSide(
    representedParty?: string | null,
    parties?: Array<{
        id?: number | string;
        role?: string;
        isClient?: boolean;
        side?: 'right' | 'left';
        isMyOffice?: boolean;
        lawyer?: { isMyOffice?: boolean };
    }>,
): 'المدعي' | 'المدعى عليه' | null {
    const client = resolveClientMarkedParty(parties);
    if (client) {
        const role = String(client.role ?? '');
        if (isAbsentObjectedRole(role) || isAbsentObjectorRole(role)) {
            const underlying = extractParentheticalUnderlyingSide(role);
            if (underlying) return underlying;
        }
    }

    const fromMarker = resolveClientPartyBucket(parties);
    if (fromMarker === 'plaintiff') return 'المدعي';
    if (fromMarker === 'defendant') return 'المدعى عليه';

    const rp = String(representedParty ?? '').trim();
    if (rp === 'المدعي' || rp === 'plaintiff' || rp === 'client') return 'المدعي';
    if (rp === 'المدعى عليه' || rp === 'defendant' || rp === 'opponent') return 'المدعى عليه';

    return null;
}
