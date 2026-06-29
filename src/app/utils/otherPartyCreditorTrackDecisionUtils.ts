import {
    appendSpecialFollowupRequest,
    dispatchDecisionsReload,
    readExecutorDecisionsArray,
    resolveExecutorDecisionRowContext,
} from '@/app/utils/executorSeizureDecisionQueue';
import { writeExecutorDecisionsUnionForExecution } from '@/app/utils/executionDecisionsNamespace';
import { syncExecutorDecisionResolution } from '@/app/utils/syncExecutorDecisionResolution';
import {
    DEBTOR_AGENT_CREDITOR_MIRROR_SOURCE,
    findPendingManualOtherPartyTrackDecision,
    matchesManualOtherPartyTrackRow,
    readDecisionsForManualTrackSync,
} from '@/app/utils/otherPartyManualTrackDecisionSync';

function supersedePriorManualOtherPartyRows(
    arr: Record<string, unknown>[],
    optionId: string
): Record<string, unknown>[] {
    const now = new Date().toISOString();
    return arr.map((row) => {
        if (!matchesManualOtherPartyTrackRow(row, optionId)) return row;
        if ((row as { requestCycleSuperseded?: boolean }).requestCycleSuperseded === true) return row;
        const pending =
            (row as { executorOutcome?: string }).executorOutcome === 'pending' ||
            (row as { executorOutcome?: string }).executorOutcome === undefined ||
            String((row as { executorOutcome?: string }).executorOutcome || '') === '';
        if (pending) return row;
        return {
            ...row,
            requestCycleSuperseded: true,
            requestCycleSupersededAt: now,
            isArchived: true,
        };
    });
}

function supersedeStoredManualOtherPartyRows(executionId: string, optionId: string): void {
    try {
        const arr = readExecutorDecisionsArray(executionId);
        const next = supersedePriorManualOtherPartyRows(arr, optionId);
        writeExecutorDecisionsUnionForExecution(executionId, next);
        dispatchDecisionsReload();
    } catch {
        /* ignore */
    }
}

export function submitCreditorOtherPartyTrackToDecisions(input: {
    executionId: string | undefined;
    optionId: string;
    label: string;
    requestDate: string;
}): { ok: boolean; decisionId?: string } {
    const exId = String(input.executionId || '').trim();
    const optionId = String(input.optionId || '').trim();
    const label = String(input.label || '').trim();
    const date = String(input.requestDate || '').trim();
    if (!exId || !optionId || !label || !date) return { ok: false };

    const decisions = readDecisionsForManualTrackSync(exId);
    const pending = findPendingManualOtherPartyTrackDecision(decisions, optionId);
    if (pending) {
        const decisionId = String((pending as { id?: string }).id || '').trim();
        if (decisionId) return { ok: true, decisionId };
    }

    supersedeStoredManualOtherPartyRows(exId, optionId);

    const decisionId = appendSpecialFollowupRequest({
        executionId: exId,
        requestDate: date,
        content: `تقدّم وكيل الدائن بـ«${label}» — متابعة من جانب موكّل المدين.`,
        appealRequestOrigin: 'debtor_side',
        decisionTitle: `${label} — قيد البت`,
        payloadJson: JSON.stringify({
            otherPartyTrackOptionId: optionId,
            source: DEBTOR_AGENT_CREDITOR_MIRROR_SOURCE,
        }),
    });

    if (!decisionId) return { ok: false };
    return { ok: true, decisionId };
}

export function resolveCreditorOtherPartyTrackDecision(input: {
    executionId: string | undefined;
    decisionId: string;
    resolution: 'approved' | 'rejected';
}): boolean {
    const exId = String(input.executionId || '').trim();
    const decisionId = String(input.decisionId || '').trim();
    if (!exId || !decisionId) return false;
    const row =
        readDecisionsForManualTrackSync(exId).find((r) => String(r.id || '') === decisionId) ??
        resolveExecutorDecisionRowContext(exId, decisionId)?.row ??
        null;
    const res = syncExecutorDecisionResolution({
        executionId: exId,
        decisionId,
        resolution: input.resolution,
        row,
        suppressNavigatorToast: true,
        skipTimeline: false,
    });
    return res.ok;
}
