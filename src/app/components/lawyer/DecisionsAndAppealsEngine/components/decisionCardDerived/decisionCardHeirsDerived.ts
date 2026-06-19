import { parseCreditorPartyDeathPayload } from '@/app/utils/creditorPartyDeathPersistence';
import type { Decision } from '../../types';

export function deriveDecisionCardHeirsContext(
    decision: Decision,
    decisions: Decision[],
    requestNeedsExecutorOutcome: (d: Decision) => boolean,
) {
    const heirsParty: 'creditor' | 'debtor' | null =
        decision.requestKind === 'creditor_party_death'
            ? 'creditor'
            : decision.requestKind === 'debtor_party_death'
              ? 'debtor'
              : null;

    const isHeirSubstitutionRequest = (() => {
        if (!heirsParty) return false;
        if (decision.requestKind === 'creditor_party_death') {
            const raw = String(decision.creditorPartyDeathPayloadJson || '').trim() || String(decision.body || '');
            const p = parseCreditorPartyDeathPayload(raw);
            return Boolean(p && p.action === 'heir_substitution');
        }
        return decision.requestKind === 'debtor_party_death';
    })();

    const heirsNeedEntry =
        Boolean(heirsParty) &&
        isHeirSubstitutionRequest &&
        (decision.executorOutcome === 'approved' || decision.executorOutcome === 'alternative') &&
        !requestNeedsExecutorOutcome(decision) &&
        !String(decision.heirSubstitutionCompletedAt || '').trim();

    const isLatestHeirsRequestForParty = (() => {
        if (!heirsParty || !isHeirSubstitutionRequest) return false;
        const sameKind = decisions.filter((d) => {
            if (d.requestKind !== decision.requestKind) return false;
            if (d.executorOutcome !== 'approved' && d.executorOutcome !== 'alternative') return false;
            if (requestNeedsExecutorOutcome(d)) return false;
            if (d.requestKind === 'creditor_party_death') {
                const raw = String(d.creditorPartyDeathPayloadJson || '').trim() || String(d.body || '');
                const p = parseCreditorPartyDeathPayload(raw);
                if (!p || p.action !== 'heir_substitution') return false;
            }
            return true;
        });
        if (sameKind.length === 0) return true;
        const best = sameKind.reduce((acc, cur) => {
            const a = String((acc as { resolvedAt?: string }).resolvedAt ?? acc.date ?? '');
            const b = String((cur as { resolvedAt?: string }).resolvedAt ?? cur.date ?? '');
            return b.localeCompare(a, undefined, { numeric: true }) > 0 ? cur : acc;
        }, sameKind[0]);
        return best.id === decision.id;
    })();

    const canOpenHeirsEntry = heirsNeedEntry && isLatestHeirsRequestForParty;

    return { heirsParty, canOpenHeirsEntry };
}
