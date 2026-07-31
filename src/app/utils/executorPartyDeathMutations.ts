import {
    getDebtorHeirSubstitutionRequestStatusFromRows,
    hasPendingCreditorPartyDeathRequestFromRows,
    isDebtorHeirSubstitutionDecisionRow,
    type ExecutorDecisionRowLite,
    type HeirSubstitutionRequestStatus,
} from '@/app/utils/executorDecisionSelectors';
import { parseCreditorPartyDeathPayload, type CreditorPartyDeathStoredAction } from '@/app/utils/creditorPartyDeathPersistence';
import {
    buildCreditorPartyDeathDecisionRow,
    buildDebtorHeirSubstitutionDecisionRow,
} from '@/app/utils/executorPartyDeathDecisionBuilders';
import { isHeirSubstitutionFollowupBlockedByAppeal } from '@/app/utils/heirSubstitutionAppealGate';

type ExecutorPartyDeathRow = Record<string, unknown>;

function asTrimmed(value: unknown): string {
    return String(value ?? '').trim();
}

export type DebtorHeirSubstitutionRequestStatus = HeirSubstitutionRequestStatus;

export function appendCreditorPartyDeathRequestRows(input: {
    rows: ExecutorPartyDeathRow[];
    action: CreditorPartyDeathStoredAction;
    creditorNameSnapshot: string;
    heirNames: string[];
    todayYmd: string;
    decisionId: string;
}): { rows: ExecutorPartyDeathRow[]; ok: boolean; decisionId?: string } {
    if (
        hasPendingCreditorPartyDeathRequestFromRows(input.rows as ExecutorDecisionRowLite[])
    ) {
        return { rows: input.rows, ok: false };
    }

    return {
        rows: [
            buildCreditorPartyDeathDecisionRow({
                decisionId: input.decisionId,
                action: input.action,
                creditorNameSnapshot: input.creditorNameSnapshot,
                heirNames: input.heirNames,
                date: input.todayYmd,
            }),
            ...input.rows,
        ],
        ok: true,
        decisionId: input.decisionId,
    };
}

export function appendDebtorHeirSubstitutionRequestRows(input: {
    rows: ExecutorPartyDeathRow[];
    debtorNameSnapshot: string;
    todayYmd: string;
    decisionId: string;
}): { rows: ExecutorPartyDeathRow[]; ok: boolean; decisionId?: string } {
    const status = getDebtorHeirSubstitutionRequestStatusFromRows(
        input.rows as ExecutorDecisionRowLite[],
    );
    if (status === 'pending') {
        return { rows: input.rows, ok: false };
    }

    return {
        rows: [
            buildDebtorHeirSubstitutionDecisionRow({
                decisionId: input.decisionId,
                debtorNameSnapshot: input.debtorNameSnapshot,
                date: input.todayYmd,
            }),
            ...input.rows,
        ],
        ok: true,
        decisionId: input.decisionId,
    };
}

export function findLatestHeirSubstitutionDecisionNeedingEntryFromRows(
    rows: ExecutorPartyDeathRow[],
    party: 'creditor' | 'debtor',
): string | null {
    const matchingRows = rows.filter((row) => {
        if (isHeirSubstitutionFollowupBlockedByAppeal(row)) return false;
        const requestKind = asTrimmed(row.requestKind);
        const executorOutcome = asTrimmed(row.executorOutcome);
        if (party === 'creditor') {
            if (requestKind !== 'creditor_party_death') return false;
            if (executorOutcome !== 'approved' && executorOutcome !== 'alternative') return false;
            if (asTrimmed(row.heirSubstitutionCompletedAt)) return false;
            const rawPayload =
                asTrimmed(row.creditorPartyDeathPayloadJson) || asTrimmed(row.body);
            const payload = parseCreditorPartyDeathPayload(rawPayload);
            return Boolean(payload && payload.action === 'heir_substitution');
        }
        if (requestKind !== 'debtor_party_death') return false;
        if (!isDebtorHeirSubstitutionDecisionRow(row)) return false;
        if (executorOutcome !== 'approved' && executorOutcome !== 'alternative') return false;
        if (asTrimmed(row.heirSubstitutionCompletedAt)) return false;
        return true;
    });

    if (matchingRows.length === 0) return null;

    const latest = matchingRows.reduce<ExecutorPartyDeathRow | null>((best, current) => {
        if (!best) return current;
        const bestDate = asTrimmed(best.resolvedAt ?? best.date);
        const currentDate = asTrimmed(current.resolvedAt ?? current.date);
        return currentDate.localeCompare(bestDate, undefined, { numeric: true }) > 0
            ? current
            : best;
    }, null);

    const id = asTrimmed(latest?.id);
    return id || null;
}
