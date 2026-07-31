import React from 'react';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import {
    isEvictionProcedureRowWorkflowComplete,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';

export type RenderEvictionProcedurePanelArgs = {
    label: string;
    row: Record<string, unknown> | null;
    branch: string;
    decisionRows: Array<Record<string, unknown>>;
    executionId: string;
    openAppeals: (decisionId: string) => void;
    afterApprove: React.ReactNode;
};

export function renderEvictionProcedurePanel({
    label,
    row,
    branch: _branch,
    decisionRows,
    executionId,
    openAppeals,
    afterApprove,
}: RenderEvictionProcedurePanelArgs): React.ReactNode {
    if (!row?.id) return null;
    const decisionId = String(row.id || '').trim();
    const rejected = isExecutorRowRejectedAndFinal(row);
    const approved = isExecutorRowApprovedWorkflowActive(row, decisionRows);
    const pending =
        String(row.executorOutcome ?? 'pending') === 'pending' ||
        String(row.executorOutcome ?? '') === '';
    const workflowComplete = isEvictionProcedureRowWorkflowComplete(row);

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
                    requestKind="eviction_procedure"
                    disabled
                    onOpenAppealCenter={() => openAppeals(decisionId)}
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
