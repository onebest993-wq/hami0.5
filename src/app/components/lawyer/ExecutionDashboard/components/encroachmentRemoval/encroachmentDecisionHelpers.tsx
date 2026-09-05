import React from 'react';
import { SeizureExecutorDecisionShortcut } from '@/app/components/lawyer/ExecutionDashboard/components/SeizureExecutorDecisionShortcut';
import {
    getGoverningEncroachmentProcedureRowForMatch,
    isExecutorRowRejectedAndFinal,
    isEvictionProcedureRowWorkflowComplete,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import { dispatchOpenDecisionsModalFromFollowup } from '@/app/utils/openDecisionsModalFromFollowup';
import type { EncroachmentRemovalWorkflowKey } from '@/app/utils/encroachmentRemovalRequests';

export function EncroachmentDecisionInlineAccordion({
    label,
    row,
    decisionRows,
    onOpenDecisions,
}: {
    label: string;
    row: Record<string, unknown> | null;
    decisionRows: Record<string, unknown>[];
    /** مُمرَّر للتوافق مع بطاقات الإزالة — الفتح عبر onOpenDecisions */
    executionId?: string;
    onOpenDecisions: (decisionId: string, decisionRow?: Record<string, unknown> | null) => void;
}) {
    if (!row?.id) return null;

    const decisionId = String(row.id || '').trim();
    const outcome = String(row.executorOutcome ?? 'pending').trim().toLowerCase() || 'pending';
    const rejected = isExecutorRowRejectedAndFinal(row);
    const approved =
        outcome === 'approved' || isExecutorRowApprovedWorkflowActive(row, decisionRows);
    const pending = outcome === 'pending' || outcome === '';

    if (pending) {
        return (
            <div
                className="mt-2 rounded-2xl border border-white/10 bg-black/15 p-3"
                dir="rtl"
                data-testid="encroachment-pending-executor-decision"
            >
                <div className="flex flex-row-reverse items-center justify-between gap-2">
                    <SeizureExecutorDecisionShortcut
                        decision={row}
                        onOpen={(id) => onOpenDecisions(String(id || decisionId), row)}
                        label="قرار المنفذ"
                    />
                    <div className="min-w-0 flex-1 text-right">
                        <p className="text-[11px] font-black text-slate-100">{label}</p>
                        <p className="mt-0.5 text-[10px] text-amber-200/90">قيد البت لدى المنفذ العدل</p>
                    </div>
                </div>
            </div>
        );
    }

    if (rejected) {
        return (
            <div
                className="mt-2 rounded-2xl border border-rose-500/25 bg-rose-950/20 p-3"
                dir="rtl"
                data-testid="encroachment-rejected-executor-decision"
            >
                <p className="text-[11px] font-black text-rose-100">تم رفض الطلب</p>
                <p className="mt-0.5 text-[10px] text-rose-200/80">{label}</p>
                <button
                    type="button"
                    onClick={() => onOpenDecisions(decisionId, row)}
                    className="mt-2 w-full rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] font-extrabold text-amber-200 hover:bg-amber-500/15"
                >
                    تقديم طعن (الذهاب لمركز القرارات)
                </button>
            </div>
        );
    }

    if (approved) {
        return (
            <div
                className="mt-2 rounded-2xl border border-emerald-500/25 bg-emerald-950/20 px-3 py-2.5"
                dir="rtl"
                data-testid="encroachment-approved-executor-decision"
            >
                <p className="text-[11px] font-black text-emerald-100">تمت موافقة المنفذ</p>
                <p className="mt-0.5 text-[10px] text-emerald-200/85">{label}</p>
            </div>
        );
    }

    return null;
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

/** فتح مركز القرارات — تبويب الحالية للمعلّق، السابقة بعد البت */
export function useEncroachmentOpenDecisions(executionId: string) {
    return React.useCallback(
        (decisionId: string, decisionRow?: Record<string, unknown> | null) => {
            if (!executionId || !decisionId) return;
            dispatchOpenDecisionsModalFromFollowup({
                storageExecutionId: executionId,
                decisionId,
                decisionRow,
            });
        },
        [executionId]
    );
}

/** @deprecated استخدم useEncroachmentOpenDecisions */
export const useEncroachmentOpenAppeals = useEncroachmentOpenDecisions;

export function encroachmentWorkflowFlags(row: Record<string, unknown> | null) {
    const saved = Boolean(String(row?.encroachmentRequestSavedAt || '').trim());
    const workflowComplete = Boolean(row?.id && isEvictionProcedureRowWorkflowComplete(row));
    const inProgress = Boolean(row?.id && !workflowComplete);
    return { saved, workflowComplete, inProgress };
}
