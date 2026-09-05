/**
 * مسارا الطعن من حكم مختلط: الحاضر يستأنف فقط؛ الغائب يختار استئنافاً أو اعتراضاً غيابياً.
 * من استُهلك اعتراضه أو استئنافه لا يُعاد إدراجه. الحاضر لا يدخل قائمة الاعتراض.
 * الاختصامي المستقل حضور-مثل حتماً: يُبقى في فلتر الاستئناف/التمييز المختلط ولا يدخل اعتراض الغياب.
 */
import {
    remainingGhayabiObjectionPartyIds,
    remainingPresentAppealPartyIds,
} from './opponentChallengeTracks';
import {
    isIndependentInterpleaderRole,
    hasAnyReleasedDisposition,
    normalizePartyJudgmentDispositions,
    resolveJudgmentPresenceWindows,
    type PartyJudgmentDisposition,
} from './partyJudgmentDisposition';
import { normalizePartyChallengeLanes } from './partyChallengeLanes';
import { partitionLawsuitPartiesByRole } from './lawsuitPartyRole';

export function isGhayabiObjectionAppealType(appealType: string | null | undefined): boolean {
    const t = String(appealType ?? '').trim();
    if (!t || t.includes('اعتراض الغير')) return false;
    return (
        t.includes('اعتراض على الحكم الغيابي')
        || t.includes('اعتراض غيابي')
        || (t.includes('اعتراض') && t.includes('غيابي'))
    );
}

function isAppealOrCassationMethod(appealType: string): boolean {
    if (isGhayabiObjectionAppealType(appealType)) return false;
    return appealType.includes('استئناف') || appealType.includes('تمييز');
}

function partiesHaveAbsentObjectionRoles(parties: Array<{ role?: string }>): boolean {
    return parties.some((party) => {
        const role = String(party.role ?? '');
        return (
            role.includes('المعترض على الحكم الغيابي')
            || role.includes('المعترض عليه بالحكم الغيابي')
        );
    });
}

function keepByPartyIds<T extends { id: number | string }>(parties: T[], ids: string[]): T[] {
    const allowed = new Set(ids);
    return parties.filter((party) => allowed.has(String(party.id)));
}

function independentInterpleaderIds(
    parties: Array<{ id: number | string; role?: string }>,
): string[] {
    return parties
        .filter((party) => isIndependentInterpleaderRole(String(party.role ?? '')))
        .map((party) => String(party.id));
}

export function filterAppellantPartiesByChallengeMethod<
    T extends { id: number | string; role?: string; isClient?: boolean },
>(
    parties: T[],
    params: {
        appealType: string | null | undefined;
        dispositions?: PartyJudgmentDisposition[] | unknown;
        lanes?: unknown;
        scalarForm?: string | null;
    },
): T[] {
    if (!Array.isArray(parties) || parties.length === 0) return [];
    const appealType = String(params.appealType ?? '').trim();
    const dispositions = normalizePartyJudgmentDispositions(params.dispositions);
    const windows = resolveJudgmentPresenceWindows(dispositions, String(params.scalarForm ?? ''));

    if (isGhayabiObjectionAppealType(appealType)) {
        const remaining = remainingGhayabiObjectionPartyIds(params.lanes, dispositions);
        if (remaining.length > 0) return keepByPartyIds(parties, remaining);
        const hadExplicitGhayabi =
            dispositions.length > 0 || normalizePartyChallengeLanes(params.lanes).length > 0;
        return hadExplicitGhayabi ? [] : parties;
    }

    if (!isAppealOrCassationMethod(appealType)) return parties;
    if (partiesHaveAbsentObjectionRoles(parties)) return parties;
    if (!windows.mixed) return parties;

    const remainingPresent = remainingPresentAppealPartyIds(params.lanes, dispositions);
    const remainingGhayabi = remainingGhayabiObjectionPartyIds(params.lanes, dispositions);
    const allowed = new Set<string>([
        ...remainingPresent,
        ...remainingGhayabi,
        ...independentInterpleaderIds(parties),
    ]);
    /*
     * عند وجود مبرَّأ (released): المدعي الموكل يحتاج الطعن في الشق المردود
     * رغم أنه خارج صفوف disposition — يُضم إن وُجدت مصلحة جزئية.
     */
    if (hasAnyReleasedDisposition(dispositions)) {
        const { plaintiffs } = partitionLawsuitPartiesByRole(parties);
        for (const party of plaintiffs) {
            if (party.isClient) allowed.add(String(party.id));
        }
    }
    if (allowed.size > 0) return keepByPartyIds(parties, [...allowed]);
    return [];
}
