import {
    inferExecutorApprovalDecisionType,
    type EvictionExecutorWorkflowKey,
} from '@/app/utils/executorApprovalWorkflow';
import {
    buildEvictionExecutorDecisionRow,
    buildGuarantorFollowupDecisionRow,
    buildThirdPartyFundsReceivedDecisionRow,
    buildTrustDisburseDecisionRow,
} from '@/app/utils/executorRequestDecisionBuilders';
import {
    evictionProcedureRowsMatch,
    getGoverningEvictionProcedureRowForNewRequest,
    isEvictionBranchBlockingNewRequest,
    isEvictionBranchResendBlocked,
    isEvictionProcedureHubRow,
    isEvictionProcedureRowActive,
    isEvictionProcedureRowPending,
    type EvictionMatchInput,
} from '@/app/utils/executorEvictionSelectors';
import { isExecutorRowEffectivelyApproved } from '@/app/utils/executorDecisionSelectors';
import { isGuarantorRequestDecisionRow } from '@/app/utils/executorDecisionSelectors';
import {
    supersedePriorExecutorHubRows,
    supersedeRejectedFinalExecutorHubRows,
} from '@/app/utils/executorRequestLifecycleMutations';

type ExecutorAppendRow = Record<string, unknown>;

type EvictionRequestKind =
    | 'eviction_procedure'
    | 'lawyer_fee_payout'
    | 'case_expense'
    | 'unified_collection';

function asTrimmed(value: unknown): string {
    return String(value ?? '').trim();
}

function isPendingRow(row: ExecutorAppendRow): boolean {
    return row.executorOutcome === 'pending' || row.executorOutcome === undefined;
}

function buildEvictionBranchGateInput(input: {
    evictionWorkflowKey?: string;
    title?: string;
}): { evictionWorkflowKey?: string; title?: string; branch?: string } {
    const workflowKey = asTrimmed(input.evictionWorkflowKey);
    const title = asTrimmed(input.title);
    const branch = workflowKey
        ? inferExecutorApprovalDecisionType({
              title,
              requestKind: 'eviction_procedure',
              evictionWorkflowKey: workflowKey as EvictionExecutorWorkflowKey,
          })
        : undefined;
    return {
        ...(workflowKey ? { evictionWorkflowKey: workflowKey } : {}),
        ...(title ? { title } : {}),
        ...(branch && branch !== 'other' ? { branch } : {}),
    };
}

export function appendGuarantorFollowupRequestRows(input: {
    rows: ExecutorAppendRow[];
    todayYmd: string;
    decisionId: string;
}): { rows: ExecutorAppendRow[]; ok: boolean; decisionId?: string } {
    const duplicate = input.rows.some((row) => isPendingRow(row) && isGuarantorRequestDecisionRow(row));
    if (duplicate) return { rows: input.rows, ok: false };

    return {
        rows: [
            buildGuarantorFollowupDecisionRow({
                id: input.decisionId,
                date: input.todayYmd,
            }),
            ...input.rows,
        ],
        ok: true,
        decisionId: input.decisionId,
    };
}

export function appendTrustDisburseRequestRows(input: {
    rows: ExecutorAppendRow[];
    todayYmd: string;
    decisionId: string;
}): { rows: ExecutorAppendRow[]; ok: boolean; decisionId?: string } {
    const duplicate = input.rows.some(
        (row) => isPendingRow(row) && asTrimmed(row.requestKind) === 'trust_disburse',
    );
    if (duplicate) return { rows: input.rows, ok: false };

    return {
        rows: [
            buildTrustDisburseDecisionRow({
                id: input.decisionId,
                date: input.todayYmd,
            }),
            ...input.rows,
        ],
        ok: true,
        decisionId: input.decisionId,
    };
}

export function appendThirdPartyFundsReceivedDecisionRows(input: {
    rows: ExecutorAppendRow[];
    thirdPartySeizureId: string;
    thirdPartyName: string;
    transferredAmountIqd: number;
    todayYmd: string;
    decisionId: string;
}): { rows: ExecutorAppendRow[]; ok: boolean; decisionId?: string } {
    const seizureId = asTrimmed(input.thirdPartySeizureId);
    const amount = Math.max(0, Math.trunc(Number(input.transferredAmountIqd || 0)));
    if (!seizureId || !Number.isFinite(amount) || amount <= 0) {
        return { rows: input.rows, ok: false };
    }

    const duplicate = input.rows.some((row) => {
        if (!isPendingRow(row)) return false;
        if (asTrimmed(row.requestKind) !== 'third_party_funds_received') return false;
        const payloadJson = asTrimmed(row.payloadJson);
        if (!payloadJson) return false;
        try {
            const payload = JSON.parse(payloadJson) as { thirdPartySeizureId?: string };
            return asTrimmed(payload?.thirdPartySeizureId) === seizureId;
        } catch {
            return false;
        }
    });
    if (duplicate) return { rows: input.rows, ok: false };

    return {
        rows: [
            buildThirdPartyFundsReceivedDecisionRow({
                id: input.decisionId,
                date: input.todayYmd,
                thirdPartySeizureId: seizureId,
                thirdPartyName: asTrimmed(input.thirdPartyName) || 'جهة ثالثة',
                transferredAmountIqd: amount,
            }),
            ...input.rows,
        ],
        ok: true,
        decisionId: input.decisionId,
    };
}

export function appendEvictionExecutorRequestRows(input: {
    rows: ExecutorAppendRow[];
    title: string;
    body: string;
    requestKind: EvictionRequestKind;
    evictionWorkflowKey?: EvictionExecutorWorkflowKey;
    supersedeCompletedHub?: boolean;
    todayYmd: string;
    decisionId: string;
    nowIso: string;
}): { rows: ExecutorAppendRow[]; ok: boolean } {
    let rows = input.rows;

    if (input.requestKind === 'lawyer_fee_payout') {
        const alreadyApproved = rows.some(
            (row) =>
                asTrimmed(row.requestKind) === 'lawyer_fee_payout' &&
                isExecutorRowEffectivelyApproved(row),
        );
        if (alreadyApproved) return { rows, ok: false };

        const duplicate = rows.some(
            (row) => isPendingRow(row) && asTrimmed(row.requestKind) === 'lawyer_fee_payout',
        );
        if (duplicate) return { rows, ok: false };
    }

    if (input.requestKind === 'unified_collection') {
        const duplicate = rows.some(
            (row) => isPendingRow(row) && asTrimmed(row.requestKind) === 'unified_collection',
        );
        if (duplicate) return { rows, ok: false };
    }

    if (input.requestKind === 'eviction_procedure') {
        const matchInput: EvictionMatchInput = {
            evictionWorkflowKey: asTrimmed(input.evictionWorkflowKey),
            title: asTrimmed(input.title),
        };

        rows = supersedeRejectedFinalExecutorHubRows(
            rows,
            (row) =>
                asTrimmed(row.requestKind) === 'eviction_procedure' &&
                evictionProcedureRowsMatch(row, matchInput) &&
                isEvictionProcedureHubRow(row),
            input.nowIso,
        );

        const hubMatches = (row: ExecutorAppendRow) =>
            asTrimmed(row.requestKind) === 'eviction_procedure' &&
            evictionProcedureRowsMatch(row, matchInput) &&
            isEvictionProcedureHubRow(row);

        const gateInput = buildEvictionBranchGateInput(matchInput);
        const governing = getGoverningEvictionProcedureRowForNewRequest(rows, matchInput);
        const governingPending =
            governing?.id &&
            isEvictionProcedureRowPending(governing) &&
            isEvictionProcedureRowActive(governing, rows);
        if (governingPending) return { rows, ok: false };

        if (input.supersedeCompletedHub) {
            rows = supersedePriorExecutorHubRows(rows, hubMatches, input.nowIso);
        } else if (governing?.id) {
            if (isEvictionBranchBlockingNewRequest(rows, gateInput)) {
                return { rows, ok: false };
            }
            if (isEvictionBranchResendBlocked(rows, gateInput)) {
                return { rows, ok: false };
            }
            if (!isEvictionProcedureRowActive(governing, rows)) {
                rows = supersedePriorExecutorHubRows(rows, hubMatches, input.nowIso);
            }
        }

        rows = rows.filter((row) => {
            if (!isPendingRow(row)) return true;
            if (asTrimmed(row.requestKind) !== 'eviction_procedure') return true;
            return !evictionProcedureRowsMatch(row, matchInput);
        });
    }

    return {
        rows: [
            buildEvictionExecutorDecisionRow({
                id: input.decisionId,
                title: input.title,
                body: input.body,
                date: input.todayYmd,
                requestKind: input.requestKind,
                evictionWorkflowKey: input.evictionWorkflowKey,
            }),
            ...rows,
        ],
        ok: true,
    };
}
