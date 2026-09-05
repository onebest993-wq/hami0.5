/**
 * تصفية قائمة المستأنفين وفق مصلحة الطعن (من خسر يطعن؛ من كسب ينتظر).
 * لا يمسّ تفريد bound|released — يعتمد نوع المنطوق + مركز الطرف فقط.
 * يُعطَّل على مسار الاعتراض الغيابي ومراحل الاعتراض (انقلاب/توحيد منفصلان).
 */
import type { Party } from '../../LawyerShared';
import { isGhayabiObjectionAppealType } from '@/app/domain/lawsuit/challengeAppellantEligibility';
import {
    isPartyOperativeReleased,
    normalizePartyJudgmentDispositions,
} from '@/app/domain/lawsuit/partyJudgmentDisposition';
import {
    extractParentheticalUnderlyingSide,
    isAbsentObjectedRole,
    isAbsentObjectorRole,
    isDefendantSideRole,
    isInterpleaderThirdPartyRole,
    isPlaintiffSideRole,
} from './partyRoleClassification';
import {
    isInterpleaderJudgmentType,
    resolveInterpleaderHadoriAppealRights,
    type LawyerJudgmentBucket,
} from './interpleaderJudgmentEngine';
import { resolveFirstInstanceHadoriAppealRights } from './firstInstanceAppealRights';
import type { FirstInstanceAppealRights } from './firstInstanceAppealRightsTypes';

const NO_APPEAL_INTEREST = new Set<FirstInstanceAppealRights['action']>([
    'wait_opponent',
    'archive_void',
    'finalize_non_merit',
]);

function partiesHaveAbsentObjectionRoles(parties: Array<{ role?: string }>): boolean {
    return parties.some((party) => {
        const role = String(party.role ?? '');
        return isAbsentObjectorRole(role) || isAbsentObjectedRole(role);
    });
}

export function resolvePartyAppealInterestBucket(
    party: {
        role?: string;
        side?: 'right' | 'left';
        status?: string;
    },
): LawyerJudgmentBucket | null {
    const role = String(party.role ?? party.status ?? '').trim();
    if (isInterpleaderThirdPartyRole(role)) return 'interpleader';
    if (isAbsentObjectedRole(role) || isAbsentObjectorRole(role)) {
        const underlying = extractParentheticalUnderlyingSide(role);
        if (underlying === 'المدعي') return 'plaintiff';
        if (underlying === 'المدعى عليه') return 'defendant';
    }
    if (isDefendantSideRole(role)) return 'defendant';
    if (isPlaintiffSideRole(role)) return 'plaintiff';
    if (party.side === 'left') return 'defendant';
    if (party.side === 'right') return 'plaintiff';
    return null;
}

export function resolveAppealInterestRights(
    judgmentType: string,
    bucket: LawyerJudgmentBucket | null,
): FirstInstanceAppealRights {
    const type = String(judgmentType ?? '').trim();
    if (!type) {
        return { action: 'both_paths', hint: '' };
    }
    if (isInterpleaderJudgmentType(type)) {
        return resolveInterpleaderHadoriAppealRights(type, bucket);
    }
    const side =
        bucket === 'plaintiff'
            ? 'المدعي'
            : bucket === 'defendant'
              ? 'المدعى عليه'
              : null;
    return resolveFirstInstanceHadoriAppealRights(type, side);
}

export function partyHasMeritAppealInterest(params: {
    judgmentType?: string | null;
    party: {
        id?: number | string;
        role?: string;
        side?: 'right' | 'left';
        status?: string;
    };
    dispositions?: unknown;
}): boolean {
    const judgmentType = String(params.judgmentType ?? '').trim();
    if (!judgmentType) return true;
    const partyId = String(params.party.id ?? '').trim();
    if (partyId) {
        const row = normalizePartyJudgmentDispositions(params.dispositions).find(
            (d) => d.partyId === partyId,
        );
        if (row && isPartyOperativeReleased(row)) return false;
    }
    const bucket = resolvePartyAppealInterestBucket(params.party);
    if (!bucket) return true;
    const rights = resolveAppealInterestRights(judgmentType, bucket);
    return !NO_APPEAL_INTEREST.has(rights.action);
}

export function filterAppellantsByAppealInterest<
    T extends { id?: number | string; role?: string; side?: 'right' | 'left'; status?: string },
>(
    parties: T[],
    params: {
        appealType?: string | null;
        judgmentType?: string | null;
        dispositions?: unknown;
    },
): T[] {
    if (!Array.isArray(parties) || parties.length === 0) return [];
    const appealType = String(params.appealType ?? '').trim();
    if (isGhayabiObjectionAppealType(appealType)) return parties;
    if (!(appealType.includes('استئناف') || appealType.includes('تمييز'))) return parties;
    if (partiesHaveAbsentObjectionRoles(parties)) return parties;
    const judgmentType = String(params.judgmentType ?? '').trim();
    if (!judgmentType) return parties;
    return parties.filter((party) =>
        partyHasMeritAppealInterest({
            judgmentType,
            party,
            dispositions: params.dispositions,
        }),
    );
}

/** للاختبارات: أطراف كاملة اختيارية عند الحاجة لاحقاً */
export type AppealInterestParty = Pick<Party, 'id' | 'role' | 'side' | 'status'>;
