/**
 * مصدر واحد لمزامنة إجراءات التخلية الجبرية مع مركز القرارات والطعون.
 */
import {
    type CreditorRequestAppealGate,
    type ExecutorRequestFollowupBlock,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import { resolveExecutorRequestAppealSyncFromRow } from '@/app/utils/executorRequestAppealSync';
import {
    getGoverningEvictionProcedureRowForBranch,
    isEvictionProcedureRowPending,
    isEvictionProcedureRowWorkflowComplete,
} from '@/app/utils/executorSeizureDecisionQueue';
import { syncEvictionAppealClosureIfNeeded } from '@/app/utils/syncEvictionAppealClosure';

export type EvictionAppealSyncBranch =
    | 'Field Visit Date'
    | 'Police Assistance Request'
    | 'Residential Grace Early End'
    | 'Lock Breaking & Inventory'
    | 'Judicial Custodian';

export const EVICTION_APPEAL_SYNC_BRANCHES: readonly EvictionAppealSyncBranch[] = [
    'Field Visit Date',
    'Police Assistance Request',
    'Residential Grace Early End',
    'Lock Breaking & Inventory',
    'Judicial Custodian',
] as const;

export type EvictionAppealSyncView = {
    branch: EvictionAppealSyncBranch;
    governingRow: Record<string, unknown> | null;
    decisionId: string | null;
    gate: CreditorRequestAppealGate;
    followupBlock: ExecutorRequestFollowupBlock | null;
    blocked: boolean;
    blocksFieldwork: boolean;
    blocksSubmit: boolean;
    cycleSuperseded: boolean;
    enforced: boolean;
    pillLabel: string;
    workflowComplete: boolean;
    decisionsNav: { decisionsTab: 'current' | 'previous'; decisionId?: string };
};

export type EvictionAppealSyncInput = {
    executionId: string | undefined;
    branch: EvictionAppealSyncBranch;
    allDecisions: Record<string, unknown>[];
};

function rowId(row: Record<string, unknown> | null | undefined): string | null {
    const id = String((row as { id?: string } | null)?.id ?? '').trim();
    return id || null;
}

const EMPTY_CONTINUE: CreditorRequestAppealGate = { kind: 'continue' };

function resolveEvictionDecisionsNav(
    row: Record<string, unknown> | null
): { decisionsTab: 'current' | 'previous'; decisionId?: string } {
    const decisionId = rowId(row);
    if (!row || !decisionId) return { decisionsTab: 'current' };
    if (isEvictionProcedureRowPending(row)) {
        return { decisionsTab: 'current', decisionId };
    }
    return { decisionsTab: 'previous', decisionId };
}

export function getGoverningEvictionAppealRow(
    allDecisions: Record<string, unknown>[],
    branch: EvictionAppealSyncBranch
): Record<string, unknown> | null {
    return getGoverningEvictionProcedureRowForBranch(allDecisions, branch);
}

export function resolveEvictionAppealSync(input: EvictionAppealSyncInput): EvictionAppealSyncView {
    const branch = input.branch;
    const governingRow = getGoverningEvictionAppealRow(input.allDecisions, branch);
    const decisionId = rowId(governingRow);

    if (!governingRow) {
        return {
            branch,
            governingRow: null,
            decisionId: null,
            gate: EMPTY_CONTINUE,
            followupBlock: null,
            blocked: false,
            blocksFieldwork: false,
            blocksSubmit: false,
            cycleSuperseded: false,
            enforced: false,
            pillLabel: '',
            workflowComplete: false,
            decisionsNav: { decisionsTab: 'current' },
        };
    }

    const core = resolveExecutorRequestAppealSyncFromRow(governingRow, input.allDecisions);
    const {
        gate,
        followupBlock: followupBlockResolved,
        blocked,
        blocksFieldwork,
        blocksSubmit,
        cycleSuperseded,
        enforced,
        pillLabel,
    } = core;

    return {
        branch,
        governingRow,
        decisionId,
        gate,
        followupBlock: followupBlockResolved,
        blocked,
        blocksFieldwork,
        blocksSubmit,
        cycleSuperseded,
        enforced,
        pillLabel,
        workflowComplete: isEvictionProcedureRowWorkflowComplete(governingRow),
        decisionsNav: resolveEvictionDecisionsNav(governingRow),
    };
}

export function resolveAllEvictionAppealSync(
    input: Omit<EvictionAppealSyncInput, 'branch'>
): Record<EvictionAppealSyncBranch, EvictionAppealSyncView> {
    const base = {
        executionId: input.executionId,
        allDecisions: input.allDecisions,
    };
    return {
        'Field Visit Date': resolveEvictionAppealSync({ ...base, branch: 'Field Visit Date' }),
        'Police Assistance Request': resolveEvictionAppealSync({
            ...base,
            branch: 'Police Assistance Request',
        }),
        'Residential Grace Early End': resolveEvictionAppealSync({
            ...base,
            branch: 'Residential Grace Early End',
        }),
        'Lock Breaking & Inventory': resolveEvictionAppealSync({
            ...base,
            branch: 'Lock Breaking & Inventory',
        }),
        'Judicial Custodian': resolveEvictionAppealSync({ ...base, branch: 'Judicial Custodian' }),
    };
}

/** إغلاق دورة التخلية بعد الطعن — يُستدعى من مركز القرارات */
export function applyEvictionAppealClosure(input: {
    executionId: string | undefined;
    row: Record<string, unknown> | null | undefined;
    allDecisions?: Record<string, unknown>[];
    forceClose?: boolean;
}): void {
    syncEvictionAppealClosureIfNeeded(input);
}
