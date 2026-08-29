import React from 'react';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import {
    getGoverningEncroachmentProcedureRowForMatch,
    isExecutorRowRejectedAndFinal,
    isEvictionProcedureRowWorkflowComplete,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import type { EncroachmentRemovalWorkflowKey } from '@/app/utils/encroachmentRemovalRequests';

export function EncroachmentDecisionInlineAccordion({
    label,
    row,
    decisionRows,
    executionId,
    onOpenAppeals,
}: {
    label: string;
    row: Record<string, unknown> | null;
    decisionRows: Record<string, unknown>[];
    executionId: string;
    onOpenAppeals: (decisionId: string) => void;
}) {
    if (!row?.id) return null;

    const decisionId = String(row.id || '').trim();
    const rejected = isExecutorRowRejectedAndFinal(row);
    const approved = isExecutorRowApprovedWorkflowActive(row, decisionRows);
    const pending =
        String(row.executorOutcome ?? 'pending') === 'pending' ||
        String(row.executorOutcome ?? '') === '';

    const steps: ExecutionInlineStep[] = [
        {
            id: `${decisionId}:sent`,
            title: label,
            subtitle: 'تم إرسال الطلب',
            status: 'done',
            tone: 'success',
        },
        {
            id: `${decisionId}:executor`,
            title: 'قرار المنفذ',
            subtitle: rejected
                ? 'تم رفض الطلب'
                : approved
                  ? 'تمت الموافقة'
                  : pending
                    ? 'قيد البت'
                    : '—',
            status: rejected || pending ? 'active' : 'done',
            tone: rejected ? 'danger' : approved ? 'success' : 'neutral',
            content: rejected ? (
                <ExecutionInlineExecutorDecisionActions
                    executionId={executionId}
                    decisionId={decisionId}
                    requestKind="eviction_procedure"
                    disabled
                    onOpenAppealCenter={() => onOpenAppeals(decisionId)}
                />
            ) : pending ? (
                <ExecutionInlineExecutorDecisionActions
                    executionId={executionId}
                    decisionId={decisionId}
                    requestKind="eviction_procedure"
                />
            ) : null,
        },
    ];

    return (
        <div className="mt-2 rounded-2xl border border-white/10 bg-black/15 p-3" dir="rtl">
            <ExecutionInlineAccordion steps={steps} />
        </div>
    );
}

export function useEncroachmentDecisionRows(decisions: unknown) {
    return React.useMemo(
        () => (Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : []),
        [decisions]
    );
}

export function useEncroachmentLatestDecision(decisions: unknown) {
    return React.useCallback(
        (workflowKey: EncroachmentRemovalWorkflowKey): Record<string, unknown> | null => {
            const list = Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : [];
            return getGoverningEncroachmentProcedureRowForMatch(list, workflowKey);
        },
        [decisions]
    );
}

export function useEncroachmentOpenAppeals(executionId: string) {
    return React.useCallback(
        (decisionId: string) => {
            if (!executionId || !decisionId) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-decisions-modal', {
                        detail: { executionId, tab: 'previous', decisionId },
                    })
                );
            } catch {
                /* ignore */
            }
        },
        [executionId]
    );
}

export function encroachmentWorkflowFlags(row: Record<string, unknown> | null) {
    const saved = Boolean(String(row?.encroachmentRequestSavedAt || '').trim());
    const workflowComplete = Boolean(row?.id && isEvictionProcedureRowWorkflowComplete(row));
    const inProgress = Boolean(row?.id && !workflowComplete);
    return { saved, workflowComplete, inProgress };
}
