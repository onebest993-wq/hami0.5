import React from 'react';
import {
    ExecutionInlineExecutorDecisionActions,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { isExecutorRowRejectedAndFinal } from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';

export function SeizureDecisionInlineActions(props: {
    row: any;
    requestKind: string;
    resolvedExecutionId: string;
    onOpenAppeals: (decisionId: string) => void;
}): React.ReactNode {
    const { row, requestKind, resolvedExecutionId, onOpenAppeals } = props;
    if (!row?.id) return null;
    const decisionId = String(row.id || '').trim();
    if (!decisionId) return null;
    const rejected = isExecutorRowRejectedAndFinal(row);
    const pending =
        String(row.executorOutcome ?? 'pending') === 'pending' ||
        String(row.executorOutcome ?? '') === '';
    if (!pending && !rejected) return null;
    if (rejected) {
        return (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-3">
                <p className="text-[11px] font-black text-rose-200 text-right">
                    تم رفض الطلب من قبل المنفذ
                </p>
                <div className="mt-2">
                    <ExecutionInlineExecutorDecisionActions
                        executionId={resolvedExecutionId}
                        decisionId={decisionId}
                        requestKind={requestKind}
                        disabled
                        onOpenAppealCenter={() => onOpenAppeals(decisionId)}
                    />
                </div>
            </div>
        );
    }
    return (
        <ExecutionInlineExecutorDecisionActions
            executionId={resolvedExecutionId}
            decisionId={decisionId}
            requestKind={requestKind}
        />
    );
}

export function buildSeizureRequestSteps(args: {
    title: string;
    row: any;
    requestKind: string;
    decisions: Record<string, unknown>[];
    resolvedExecutionId: string;
    onOpenAppeals: (decisionId: string) => void;
    extra?: React.ReactNode;
}): ExecutionInlineStep[] {
    const { title, row, requestKind, decisions, resolvedExecutionId, onOpenAppeals, extra } = args;
    const hasRow = Boolean(row?.id);
    const rejected = hasRow ? isExecutorRowRejectedAndFinal(row) : false;
    const approved = hasRow ? isExecutorRowApprovedWorkflowActive(row, decisions) : false;
    const pending = hasRow
        ? String(row.executorOutcome ?? 'pending') === 'pending' ||
          String(row.executorOutcome ?? '') === ''
        : false;
    return [
        {
            id: `${title}:submit`,
            title,
            subtitle: hasRow ? 'تم إرسال الطلب إلى سلطة المنفذ' : 'لم يتم إرسال الطلب بعد',
            status: hasRow ? 'done' : 'active',
            tone: hasRow ? 'success' : 'neutral',
        } satisfies ExecutionInlineStep,
        {
            id: `${title}:executor`,
            title: 'قرار المنفذ',
            subtitle: rejected
                ? 'تم رفض الطلب'
                : approved
                  ? 'تمت الموافقة'
                  : pending
                    ? 'قيد البت'
                    : '—',
            status: rejected ? 'active' : pending ? 'active' : hasRow ? 'done' : 'locked',
            tone: rejected ? 'danger' : approved ? 'success' : 'neutral',
            content: hasRow ? (
                <SeizureDecisionInlineActions
                    row={row}
                    requestKind={requestKind}
                    resolvedExecutionId={resolvedExecutionId}
                    onOpenAppeals={onOpenAppeals}
                />
            ) : null,
        } satisfies ExecutionInlineStep,
        ...(extra
            ? [
                  {
                      id: `${title}:details`,
                      title: 'إكمال البيانات',
                      subtitle: 'حقول مدمجة داخل نفس البطاقة',
                      status: approved && !rejected ? 'active' : 'locked',
                      tone: approved && !rejected ? 'neutral' : 'neutral',
                      content: approved && !rejected ? extra : null,
                  } satisfies ExecutionInlineStep,
              ]
            : []),
    ];
}
