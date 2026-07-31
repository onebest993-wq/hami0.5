import {
    inferExecutorApprovalDecisionType,
    type EvictionExecutorWorkflowKey,
} from '@/app/utils/executorApprovalWorkflow';
import {
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
    type ExecutorDecisionRowLite,
} from '@/app/utils/executorDecisionSelectors';
import {
    isCassationAffirmResult,
    isExecutorRequestAppealCycleSupersededFromRecord,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';

type EvictionDecisionRow = ExecutorDecisionRowLite & {
    requestKind?: string;
    title?: string;
    appealSourceDecisionId?: string;
    executorOutcome?: string;
    appealStatus?: string;
    appealResult?: string;
    noAppealChosen?: boolean;
    evictionWorkflowKey?: string;
    encroachmentWorkflowKey?: string;
    encroachmentRequestSavedAt?: string;
    executorScheduleLabel?: string;
    policeAssistanceSavedAt?: string;
    breakInventoryFurnitureFinalizedAt?: string;
    judicialCustodianDetailsSavedAt?: string;
    evictionGraceSavedAt?: string;
    isArchived?: boolean;
    requestCycleSuperseded?: boolean;
};

export type EvictionMatchInput = {
    evictionWorkflowKey?: string;
    encroachmentWorkflowKey?: string;
    title?: string;
};

export type EvictionBranchInput = {
    evictionWorkflowKey?: string;
    title?: string;
    branch?: string;
};

function asTrimmed(value: unknown): string {
    return String(value ?? '').trim();
}

function isExecutorHubRowSuperseded(row: EvictionDecisionRow | null | undefined): boolean {
    return row?.requestCycleSuperseded === true;
}

function evictionProcedureRowSortKey(row: EvictionDecisionRow): string {
    return asTrimmed(row.resolvedAt ?? row.date);
}

function sortEvictionProcedureRowsNewestFirst(rows: ReadonlyArray<EvictionDecisionRow>): EvictionDecisionRow[] {
    return [...rows].sort((a, b) =>
        evictionProcedureRowSortKey(b).localeCompare(evictionProcedureRowSortKey(a), undefined, {
            numeric: true,
        }),
    );
}

function inferEvictionBranch(input: {
    title?: string;
    evictionWorkflowKey?: string;
}): string | undefined {
    const workflowKey = asTrimmed(input.evictionWorkflowKey);
    if (!workflowKey) return undefined;
    const branch = inferExecutorApprovalDecisionType({
        title: String(input.title ?? ''),
        requestKind: 'eviction_procedure',
        evictionWorkflowKey: workflowKey as EvictionExecutorWorkflowKey,
    });
    return branch && branch !== 'other' ? branch : undefined;
}

function evictionProcedureTitlesMatch(a: string, b: string): boolean {
    const normalizedA = normalizeEvictionProcedureTitle(a);
    const normalizedB = normalizeEvictionProcedureTitle(b);
    if (!normalizedA || !normalizedB) return false;
    if (normalizedA === normalizedB) return true;
    return normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA);
}

function evictionProcedureHubRowsForBranch(
    rows: ReadonlyArray<EvictionDecisionRow>,
    branch: string,
): EvictionDecisionRow[] {
    const targetBranch = asTrimmed(branch);
    if (!targetBranch) return [];
    return rows.filter((row) => {
        if (asTrimmed(row.requestKind) !== 'eviction_procedure') return false;
        if (!isEvictionProcedureHubRow(row)) return false;
        return inferEvictionBranch(row) === targetBranch;
    });
}

export function normalizeEvictionProcedureTitle(title: string): string {
    return String(title || '')
        .trim()
        .replace(/^[\s\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F]+/u, '')
        .trim();
}

export function evictionProcedureRowsMatch(
    row: EvictionDecisionRow,
    input: EvictionMatchInput,
): boolean {
    const encroachmentWorkflowKey = asTrimmed(input.encroachmentWorkflowKey);
    if (encroachmentWorkflowKey) {
        const rowEncroachmentWorkflowKey = asTrimmed(row.encroachmentWorkflowKey);
        if (rowEncroachmentWorkflowKey === encroachmentWorkflowKey) return true;
    }

    const workflowKey = asTrimmed(input.evictionWorkflowKey);
    const rowWorkflowKey = asTrimmed(row.evictionWorkflowKey);
    if (workflowKey && rowWorkflowKey && rowWorkflowKey === workflowKey) return true;

    return evictionProcedureTitlesMatch(String(input.title ?? ''), String(row.title ?? ''));
}

export function isEvictionProcedureHubRow(
    row: EvictionDecisionRow | null | undefined,
): boolean {
    if (!row) return false;
    return asTrimmed(row.appealSourceDecisionId) === '';
}

export function isEvictionProcedureRowPending(
    row: EvictionDecisionRow | null | undefined,
): boolean {
    if (!row) return false;
    const outcome = asTrimmed(row.executorOutcome || 'pending');
    return outcome === 'pending' || outcome === '';
}

export function listEvictionProcedureHubRowsForBranch(
    rows: ReadonlyArray<EvictionDecisionRow>,
    branch: string,
): EvictionDecisionRow[] {
    return sortEvictionProcedureRowsNewestFirst(evictionProcedureHubRowsForBranch(rows, branch));
}

export function listEvictionProcedureHubRowsForMatch(
    rows: ReadonlyArray<EvictionDecisionRow>,
    input: EvictionMatchInput,
): EvictionDecisionRow[] {
    return sortEvictionProcedureRowsNewestFirst(
        rows.filter(
            (row) =>
                asTrimmed(row.requestKind) === 'eviction_procedure' &&
                isEvictionProcedureHubRow(row) &&
                evictionProcedureRowsMatch(row, input),
        ),
    );
}

export function getNewestEvictionProcedureRowForMatch(
    rows: ReadonlyArray<EvictionDecisionRow>,
    input: EvictionMatchInput,
): EvictionDecisionRow | null {
    return listEvictionProcedureHubRowsForMatch(rows, input)[0] ?? null;
}

export function getNewestEvictionProcedureRowForBranch(
    rows: ReadonlyArray<EvictionDecisionRow>,
    branch: string,
): EvictionDecisionRow | null {
    return listEvictionProcedureHubRowsForBranch(rows, branch)[0] ?? null;
}

export function isEvictionProcedureRowWorkflowComplete(row: EvictionDecisionRow): boolean {
    if (isExecutorRowRejectedAndFinal(row)) return true;
    if (!isExecutorRowEffectivelyApproved(row)) return false;

    const encroachmentWorkflowKey = asTrimmed(row.encroachmentWorkflowKey);
    if (encroachmentWorkflowKey) {
        return asTrimmed(row.encroachmentRequestSavedAt) !== '';
    }

    const branch = inferEvictionBranch(row);
    if (branch === 'Field Visit Date') return asTrimmed(row.executorScheduleLabel) !== '';
    if (branch === 'Police Assistance Request') {
        return asTrimmed(row.policeAssistanceSavedAt) !== '';
    }
    if (branch === 'Lock Breaking & Inventory') {
        return asTrimmed(row.breakInventoryFurnitureFinalizedAt) !== '';
    }
    if (branch === 'Marital Furniture Delivery') {
        return (
            asTrimmed(row.executorScheduleLabel) !== '' &&
            asTrimmed(row.breakInventoryFurnitureFinalizedAt) !== ''
        );
    }
    if (branch === 'Judicial Custodian') {
        return asTrimmed(row.judicialCustodianDetailsSavedAt) !== '';
    }
    if (branch === 'Grace Period') return asTrimmed(row.evictionGraceSavedAt) !== '';
    if (branch === 'Eviction') return true;
    return false;
}

export function isEvictionProcedureRowActive(
    row: EvictionDecisionRow,
    allDecisions: ReadonlyArray<EvictionDecisionRow> = [],
): boolean {
    if (
        allDecisions.length > 0 &&
        isExecutorRequestAppealCycleSupersededFromRecord(
            row,
            allDecisions as Record<string, unknown>[],
        )
    ) {
        return false;
    }

    const outcome = asTrimmed(row.executorOutcome);
    const appealStatus = asTrimmed(row.appealStatus);
    const appealResult = asTrimmed(row.appealResult);

    if (outcome === 'rejected') {
        if (appealStatus === 'final') {
            if (isCassationAffirmResult(appealResult) || appealResult === 'رد التظلم') {
                return false;
            }
            if (appealResult === 'نقض القرار') {
                return (
                    isExecutorRowEffectivelyApproved(row) &&
                    !isEvictionProcedureRowWorkflowComplete(row)
                );
            }
            return false;
        }
        if (row.noAppealChosen === true) return false;
    }

    if (isExecutorRowRejectedAndFinal(row)) return false;
    if (isEvictionProcedureRowPending(row)) return true;
    if (isExecutorRowEffectivelyApproved(row)) {
        return !isEvictionProcedureRowWorkflowComplete(row);
    }
    return false;
}

export function getGoverningEvictionProcedureRowForBranch(
    rows: ReadonlyArray<EvictionDecisionRow>,
    branch: string,
): EvictionDecisionRow | null {
    const sorted = sortEvictionProcedureRowsNewestFirst(
        evictionProcedureHubRowsForBranch(rows, branch).filter(
            (row) => !isExecutorHubRowSuperseded(row),
        ),
    );
    const active = sorted.find((row) => isEvictionProcedureRowActive(row, rows));
    return active ?? sorted[0] ?? null;
}

export function getGoverningEvictionProcedureRowForMatch(
    rows: ReadonlyArray<EvictionDecisionRow>,
    input: EvictionMatchInput,
): EvictionDecisionRow | null {
    const sorted = listEvictionProcedureHubRowsForMatch(rows, input);
    const active = sorted.find((row) => isEvictionProcedureRowActive(row, rows));
    return active ?? sorted[0] ?? null;
}

export function getGoverningEncroachmentProcedureRowForMatch(
    rows: ReadonlyArray<EvictionDecisionRow>,
    encroachmentWorkflowKey: string,
): EvictionDecisionRow | null {
    const key = asTrimmed(encroachmentWorkflowKey);
    if (!key) return null;
    return getGoverningEvictionProcedureRowForMatch(rows, { encroachmentWorkflowKey: key });
}

export function isEvictionBranchBlockingNewRequest(
    rows: ReadonlyArray<EvictionDecisionRow>,
    input: EvictionBranchInput,
): boolean {
    const branch = asTrimmed(input.branch);
    const newest = branch
        ? getNewestEvictionProcedureRowForBranch(rows, branch)
        : getNewestEvictionProcedureRowForMatch(rows, input);
    if (!newest) return false;
    return isEvictionProcedureRowActive(newest, rows);
}

export function getGoverningEvictionProcedureRowForNewRequest(
    rows: ReadonlyArray<EvictionDecisionRow>,
    input: { evictionWorkflowKey?: string; title?: string },
): EvictionDecisionRow | null {
    const branch = inferEvictionBranch(input);
    if (branch) {
        const byBranch = getGoverningEvictionProcedureRowForBranch(rows, branch);
        if (byBranch?.id) return byBranch;
    }
    return getGoverningEvictionProcedureRowForMatch(rows, input);
}

export function isEvictionBranchResendBlocked(
    rows: ReadonlyArray<EvictionDecisionRow>,
    input: EvictionMatchInput & { branch?: string },
): boolean {
    const branch = asTrimmed(input.branch);
    const governing = branch
        ? getGoverningEvictionProcedureRowForBranch(rows, branch)
        : getGoverningEvictionProcedureRowForMatch(rows, input);
    if (!governing?.id) return false;
    if (isExecutorRequestAppealCycleSupersededFromRecord(governing, rows as Record<string, unknown>[])) return false;
    return isEvictionProcedureRowActive(governing, rows);
}
