import type { ExecutionFile } from '@/app/types/execution';
import {
    buildExecutionMergeForCreditorHeirSubstitutionApproval,
    buildExecutionMergeForCreditorPartyDeath,
    buildExecutionMergeForDebtorHeirSubstitutionApproval,
    parseCreditorPartyDeathPayload,
} from '@/app/utils/creditorPartyDeathPersistence';
import { parseDebtorPartyDeathPayload } from '@/app/utils/executorPartyDeathDecisionBuilders';
import { dispatchOpenPartyDeathModal, type PartyDeathUiParty } from '@/app/utils/partyDeathUiEvents';

export type HeirSubstitutionExecutorRow = {
    id?: string;
    title?: string;
    body?: string;
    requestKind?: string;
    creditorPartyDeathPayloadJson?: string;
    debtorPartyDeathPayloadJson?: string;
};

export type HeirSubstitutionExecutorMergeResult = {
    merge: Record<string, unknown>;
    party: PartyDeathUiParty;
    openHeirsEntry: boolean;
};

function countExistingPartyHeirs(
    executionData: ExecutionFile | null | undefined,
    party: PartyDeathUiParty,
): number {
    const fromParty =
        party === 'creditor'
            ? executionData?.creditors?.[0]?.heirs
            : executionData?.debtors?.[0]?.heirs;
    const fromCase =
        party === 'creditor'
            ? executionData?.creditor_party_death_case?.heir_names
            : executionData?.debtor_party_death_case?.heir_names;
    return [...(fromParty || []), ...(fromCase || [])].filter((s) => /\S/.test(String(s))).length;
}

function creditorPayloadFromRow(row: HeirSubstitutionExecutorRow) {
    const explicit = String(row.creditorPartyDeathPayloadJson || '').trim();
    const body = String(row.body || '').trim();
    const title = String(row.title || '').trim();
    const id = String(row.id || '').trim();
    const deathTitleLikely =
        /وفاة\s*الدائن|إبلاغ\s*وفاة\s*الدائن|إحلال\s*الورثة\s*محل\s*الدائن|دون\s*ورثة/i.test(title);
    const deathIdLikely = /^creditor_death_req_/i.test(id);
    const raw = explicit || (deathTitleLikely || deathIdLikely ? body : '');
    return raw ? parseCreditorPartyDeathPayload(raw) : null;
}

export function buildHeirSubstitutionExecutorMerge(
    row: HeirSubstitutionExecutorRow,
    executionData: ExecutionFile | null | undefined,
): HeirSubstitutionExecutorMergeResult | null {
    const kind = String(row.requestKind || '').trim();

    if (kind === 'creditor_party_death') {
        const parsed = creditorPayloadFromRow(row);
        if (!parsed) return null;
        const incomingHeirs = parsed.heir_names.filter((s) => /\S/.test(String(s)));
        const merge =
            parsed.action === 'heir_substitution' && incomingHeirs.length === 0
                ? buildExecutionMergeForCreditorHeirSubstitutionApproval(
                      executionData,
                      parsed.creditorNameSnapshot,
                  )
                : buildExecutionMergeForCreditorPartyDeath(executionData, parsed);
        return {
            merge,
            party: 'creditor',
            openHeirsEntry:
                parsed.action === 'heir_substitution' &&
                incomingHeirs.length === 0 &&
                countExistingPartyHeirs(executionData, 'creditor') === 0,
        };
    }

    if (kind === 'debtor_party_death') {
        const raw =
            String(row.debtorPartyDeathPayloadJson || '').trim() || String(row.body || '').trim();
        const parsed = parseDebtorPartyDeathPayload(raw);
        const name = parsed?.debtorNameSnapshot || '';
        const incomingHeirs = (parsed?.heir_names || []).filter((s) => /\S/.test(String(s)));
        return {
            merge: buildExecutionMergeForDebtorHeirSubstitutionApproval(executionData, name),
            party: 'debtor',
            openHeirsEntry:
                incomingHeirs.length === 0 && countExistingPartyHeirs(executionData, 'debtor') === 0,
        };
    }

    return null;
}

export function dispatchHeirSubstitutionHeirsEntry(input: {
    executionId?: string;
    decisionId?: string;
    party: PartyDeathUiParty;
}): void {
    dispatchOpenPartyDeathModal({
        executionId: input.executionId,
        party: input.party,
        decisionId: input.decisionId,
    });
}
