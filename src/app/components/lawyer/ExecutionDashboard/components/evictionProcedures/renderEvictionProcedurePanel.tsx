import React from 'react';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import {
    dispatchDecisionsReload,
    isEvictionProcedureRowWorkflowComplete,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import {
    buildEvictionAfterApproveContent,
    type EvictionAfterApproveDeps,
} from '../evictionProcedureAfterApprove';

export type RenderEvictionProcedurePanelInput = {
    label: string;
    row: Record<string, unknown> | null;
    branch: string;
    executionId: string;
    decisionRows: Array<Record<string, unknown>>;
    afterApproveDeps: EvictionAfterApproveDeps;
    openAppeals: (decisionId: string, decisionRow?: Record<string, unknown> | null) => void;
};

export function renderEvictionProcedurePanel({
    label,
    row,
    branch,
    executionId,
    decisionRows,
    afterApproveDeps,
    openAppeals,
}: RenderEvictionProcedurePanelInput): React.ReactNode {
    if (!row?.id) return null;
    const decisionId = String(row.id || '').trim();
    const rejected = isExecutorRowRejectedAndFinal(row);
    const approved = isExecutorRowApprovedWorkflowActive(row, decisionRows);
    const pending =
        String(row.executorOutcome ?? 'pending') === 'pending' ||
        String(row.executorOutcome ?? '') === '';
    const workflowComplete = isEvictionProcedureRowWorkflowComplete(row);
    const afterApprove = buildEvictionAfterApproveContent(row, branch, afterApproveDeps);

    if (workflowComplete && approved && !rejected) {
        return null;
    }

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
                  ? workflowComplete
                      ? 'تمت الموافقة — اكتمل الإجراء'
                      : 'تمت الموافقة'
                  : pending
                    ? 'قيد البت'
                    : '—',
            status: rejected || pending ? 'active' : 'done',
            tone: rejected ? 'danger' : approved ? 'success' : 'neutral',
            content: rejected ? (
                <ExecutionInlineExecutorDecisionActions
                    executionId={executionId}
                    decisionId={decisionId}
                    decisionRow={row}
                    requestKind="eviction_procedure"
                    disabled
                    onOpenAppealCenter={() => openAppeals(decisionId, row)}
                />
            ) : pending ? (
                <ExecutionInlineExecutorDecisionActions
                    executionId={executionId}
                    decisionId={decisionId}
                    decisionRow={row}
                    requestKind="eviction_procedure"
                    onResolved={(result) => {
                        if (result.ok) dispatchDecisionsReload();
                    }}
                />
            ) : approved ? (
                <button
                    type="button"
                    onClick={() => openAppeals(decisionId, row)}
                    className="w-full rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] font-extrabold text-amber-200 hover:bg-amber-500/15"
                >
                    متابعة قرار المنفذ
                </button>
            ) : null,
        },
    ];

    if (approved && !rejected && afterApprove && !workflowComplete) {
        steps.push({
            id: `${decisionId}:after`,
            title: 'إكمال البيانات',
            subtitle: 'وسّع لإدخال البيانات المطلوبة',
            status: 'active',
            tone: 'neutral',
            content: afterApprove,
        });
    }

    return (
        <div className="px-3 pb-3 pt-2" dir="rtl">
            <ExecutionInlineAccordion steps={steps} />
        </div>
    );
}
