import type { Party } from '../../LawyerShared';
import {
    extractParentheticalUnderlyingSide,
    isAbsentObjectedRole,
    isAbsentObjectorRole,
    isDefendantSideRole,
    isInterpleaderThirdPartyRole,
    isPlaintiffSideRole,
    partitionPartiesForHeader,
} from './partyRoleClassification';
import { resolveClientMarkedParty } from './clientMarkedParty';

export type LawyerJudgmentBucket = 'plaintiff' | 'defendant' | 'interpleader';

/** صفة الطرف المعلّم موكلاً فقط — لا تعتمد على إعدادات الملف */
export function resolveClientPartyBucket(
    parties?: Array<{
        id?: number | string;
        role?: string;
        isClient?: boolean;
        side?: 'right' | 'left';
        isMyOffice?: boolean;
        lawyer?: { isMyOffice?: boolean };
    }>,
): LawyerJudgmentBucket | null {
    const client = resolveClientMarkedParty(parties);
    if (!client) return null;

    const role = String(client.role ?? '');
    if (isInterpleaderThirdPartyRole(role)) return 'interpleader';
    if (isAbsentObjectedRole(role) || isAbsentObjectorRole(role)) {
        const underlying = extractParentheticalUnderlyingSide(role);
        if (underlying === 'المدعي') return 'plaintiff';
        if (underlying === 'المدعى عليه') return 'defendant';
    }
    if (isDefendantSideRole(role)) return 'defendant';
    if (isPlaintiffSideRole(role)) return 'plaintiff';
    if (client.side === 'left') return 'defendant';
    if (client.side === 'right') return 'plaintiff';

    if (Array.isArray(parties) && parties.length > 0) {
        const partitioned = partitionPartiesForHeader(parties as Party[]);
        const clientId = 'id' in client ? client.id : undefined;
        const matches = (p: Party) => clientId != null && p.id === clientId;
        if (partitioned.interpleaders.some(matches)) return 'interpleader';
        if (partitioned.plaintiffs.some(matches)) return 'plaintiff';
        if (partitioned.defendants.some(matches)) return 'defendant';
    }

    return null;
}
