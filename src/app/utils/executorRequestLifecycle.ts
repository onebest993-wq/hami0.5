import {
    isEvictionProcedureRowWorkflowComplete,
    isExecutorHubRowSuperseded,
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';

export type ExecutorRequestLifecycleEntry = {
    cycleNumber: number;
    decisionId: string;
    submittedAt: string;
    submittedAtLabel: string;
    outcomeLabel: string;
    outcomeTone: 'success' | 'danger' | 'amber' | 'neutral';
    workflowComplete: boolean;
    superseded: boolean;
    supersededAtLabel?: string;
};

export type ExecutorRequestLifecycleSummary = {
    submissions: number;
    approvals: number;
    rejections: number;
    pending: number;
    entries: ExecutorRequestLifecycleEntry[];
};

function resolveSubmittedAt(row: Record<string, unknown>): string {
    return String(
        (row as { date?: string }).date ||
            (row as { resolvedAt?: string }).resolvedAt ||
            (row as { requestCycleSupersededAt?: string }).requestCycleSupersededAt ||
            ''
    ).trim();
}

function formatLifecycleDateLabel(raw: string): string {
    const s = String(raw || '').trim();
    if (!s) return '—';
    const ymd = s.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
    return s;
}

function resolveOutcome(row: Record<string, unknown>): {
    label: string;
    tone: ExecutorRequestLifecycleEntry['outcomeTone'];
} {
    if (isExecutorRowRejectedAndFinal(row)) {
        return { label: 'مرفوض', tone: 'danger' };
    }
    const outcome = String((row as { executorOutcome?: string }).executorOutcome || '').trim();
    if (!outcome || outcome === 'pending') {
        return { label: 'قيد البت', tone: 'amber' };
    }
    if (outcome === 'withdrawn' || (row as { lawyerWithdrawn?: boolean }).lawyerWithdrawn) {
        return { label: 'منسحب', tone: 'neutral' };
    }
    const requestKind = String((row as { requestKind?: string }).requestKind || '').trim();
    let complete = false;
    if (requestKind === 'seizure') {
        complete = Boolean(String((row as { seizureRequestSavedAt?: string }).seizureRequestSavedAt || '').trim());
    } else if (requestKind === 'eviction_procedure') {
        complete = isEvictionProcedureRowWorkflowComplete(row);
    } else if (requestKind === 'guarantor_request') {
        complete = Boolean(
            String((row as { guarantorDetailsSavedAt?: string }).guarantorDetailsSavedAt || '').trim()
        );
    }
    if (isExecutorRowEffectivelyApproved(row)) {
        return complete
            ? { label: 'مكتمل', tone: 'success' }
            : { label: 'موافق — بانتظار الإكمال', tone: 'success' };
    }
    return { label: '—', tone: 'neutral' };
}

/** @alias summarizeExecutorHubRequestLifecycle */
export const summarizeHubRequestLifecycle = summarizeExecutorHubRequestLifecycle;

/** تلخيص دورات تقديم طلب hub (نشطة + مؤرشفة) */
export function summarizeExecutorHubRequestLifecycle(
    rowsNewestFirst: Record<string, unknown>[]
): ExecutorRequestLifecycleSummary | null {
    if (!rowsNewestFirst.length) return null;

    const chronological = [...rowsNewestFirst].reverse();
    const entries: ExecutorRequestLifecycleEntry[] = chronological.map((row, idx) => {
        const submittedAt = resolveSubmittedAt(row);
        const { label, tone } = resolveOutcome(row);
        const superseded = isExecutorHubRowSuperseded(row);
        const supersededAt = String(
            (row as { requestCycleSupersededAt?: string }).requestCycleSupersededAt || ''
        ).trim();
        return {
            cycleNumber: idx + 1,
            decisionId: String((row as { id?: string }).id || '').trim(),
            submittedAt,
            submittedAtLabel: formatLifecycleDateLabel(submittedAt),
            outcomeLabel: label,
            outcomeTone: tone,
            workflowComplete: isEvictionProcedureRowWorkflowComplete(row),
            superseded,
            supersededAtLabel: superseded ? formatLifecycleDateLabel(supersededAt) : undefined,
        };
    });

    return {
        submissions: rowsNewestFirst.length,
        approvals: rowsNewestFirst.filter((row) => isExecutorRowEffectivelyApproved(row)).length,
        rejections: rowsNewestFirst.filter((row) => isExecutorRowRejectedAndFinal(row)).length,
        pending: rowsNewestFirst.filter((row) => {
            const o = String((row as { executorOutcome?: string }).executorOutcome || '').trim();
            return !o || o === 'pending';
        }).length,
        entries: [...entries].reverse(),
    };
}
