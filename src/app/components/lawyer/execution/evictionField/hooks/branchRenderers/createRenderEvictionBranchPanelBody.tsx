import React from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import {
    getGoverningEvictionProcedureRowForBranch,
    isEvictionProcedureRowActive,
    isEvictionProcedureRowPending,
    isEvictionProcedureRowWorkflowComplete,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import { branchRowNeedsPostApprovalInlineWork } from '../../utils/branchRowNeedsPostApprovalInlineWork';
import type { EvictionBranchRenderersCtx } from './evictionBranchRenderersCtx';

export function createRenderEvictionBranchPanelBody(
    ctx: EvictionBranchRenderersCtx,
    renderInlineDecision: (branch: string, label: string, afterApprove?: React.ReactNode) => React.ReactNode,
) {
    const {
        inlineExpandedByBranch,
        isBranchInProgress,
        branchFollowupBlocked,
        renderFollowupBlockStrip,
        renderPendingDecisionStrip,
        renderRejectedBranchNotice,
        branchAppealCycleSuperseded,
        syncForBranch,
        resolvePanelExecutionId,
        decisions,
        renderBranchExecutorActionsStrip,
        openAppeals,
        isBranchWorkflowComplete,
    } = ctx;

    return (
        branch: string,
        label: string,
        afterApprove?: React.ReactNode,
        onRejectedResubmit?: () => void
    ) => {
    if (!inlineExpandedByBranch[branch] || !isBranchInProgress(branch)) return null;
    const followupStrip = branchFollowupBlocked(branch) ? renderFollowupBlockStrip(branch) : null;
    const pendingStrip = renderPendingDecisionStrip(branch);
    const rejectedNotice =
        onRejectedResubmit && !pendingStrip
            ? renderRejectedBranchNotice(branch, onRejectedResubmit)
            : null;
    const inlinePanel =
        branchFollowupBlocked(branch) && followupStrip
            ? null
            : renderInlineDecision(branch, label, afterApprove);
    const body = followupStrip || pendingStrip || inlinePanel || rejectedNotice;
    if (body) return <>{body}</>;
    if (branchFollowupBlocked(branch) && !branchAppealCycleSuperseded(branch)) {
        const sync = syncForBranch(branch);
        const execId = resolvePanelExecutionId();
        const list = Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : [];
        const governingRow = getGoverningEvictionProcedureRowForBranch(list, branch);
        const blockedActions =
            governingRow?.id && isEvictionProcedureRowActive(governingRow, list)
                ? renderBranchExecutorActionsStrip(
                      branch,
                      governingRow,
                      'الطلب موقوف — أكمل مسار الطعن',
                      { disabled: true, onOpenAppealCenter: () => openAppeals(String(governingRow.id)) }
                  )
                : null;
        return (
            <div className="border-t border-white/10 px-3 py-3 text-[10px] leading-relaxed text-right space-y-2">
                <p className="text-amber-200/90">
                    {sync.followupBlock?.message ??
                        'الإجراء موقوف بسبب التظلم أو الطعن — تابع من مركز القرارات.'}
                </p>
                {blockedActions}
                {sync.decisionId && execId ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openAppeals(sync.decisionId!);
                        }}
                        className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] font-bold text-amber-100"
                    >
                        فتح مركز القرارات والطعون
                    </button>
                ) : null}
            </div>
        );
    }
    if (isBranchWorkflowComplete(branch)) {
        return (
            <div className="border-t border-white/10 px-3 py-3 text-[10px] leading-relaxed text-emerald-300/90 text-right">
                تم إكمال هذا الإجراء. لإرسال طلب جديد اضغط الزر أعلاه.
            </div>
        );
    }
    const list = Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : [];
    const governingRow = getGoverningEvictionProcedureRowForBranch(list, branch);
    if (
        governingRow?.id &&
        isEvictionProcedureRowPending(governingRow) &&
        isEvictionProcedureRowActive(governingRow, list)
    ) {
        const pendingActions = renderBranchExecutorActionsStrip(
            branch,
            governingRow,
            'قرار المنفذ — قيد البت'
        );
        if (pendingActions) return pendingActions;
        return (
            <div className="border-t border-white/10 px-3 py-3 text-[10px] leading-relaxed text-amber-200/90 text-right">
                الطلب قيد البت لدى منفذ العدل — تابع من «القرارات والطعون» أو انتظر التحديث هنا.
            </div>
        );
    }
    if (
        governingRow?.id &&
        branchRowNeedsPostApprovalInlineWork(branch, governingRow, list)
    ) {
        const retryInline = renderInlineDecision(branch, label, afterApprove);
        if (retryInline) return retryInline;
    }
    if (
        governingRow?.id &&
        isExecutorRowApprovedWorkflowActive(governingRow, list) &&
        isEvictionProcedureRowWorkflowComplete(governingRow)
    ) {
        return (
            <div className="border-t border-white/10 px-3 py-3 text-[10px] leading-relaxed text-emerald-300/90 text-right">
                تم إكمال هذا الإجراء. لإرسال طلب جديد اضغط الزر أعلاه.
            </div>
        );
    }
    const sync = syncForBranch(branch);
    const execId = resolvePanelExecutionId();
    const inProgress = isBranchInProgress(branch);
    return (
        <div className="border-t border-white/10 px-3 py-3 text-[10px] leading-relaxed text-right space-y-2">
            <p className={inProgress ? 'text-amber-200/90' : 'text-slate-400'}>
                {inProgress
                    ? 'جاري تجهيز الخطوة التالية — إن لم يظهر النموذج خلال ثوانٍ أعد فتح التبويب أو تابع من مركز القرارات.'
                    : 'لا تتوفر خطوة تالية هنا — افتح «القرارات والطعون» لمتابعة الطلب.'}
            </p>
            {sync.decisionId && execId ? (
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openAppeals(sync.decisionId!);
                    }}
                    className="rounded-xl border border-indigo-500/35 bg-indigo-950/45 px-3 py-2 text-[11px] font-bold text-indigo-100"
                >
                    فتح مركز القرارات والطعون
                </button>
            ) : null}
        </div>
    );
    };
}

export function createRenderBranchChevron(ctx: EvictionBranchRenderersCtx) {
    const { isBranchInProgress, inlineExpandedByBranch } = ctx;
    return (branch: string) => {
        if (!isBranchInProgress(branch)) return null;
        const open = Boolean(inlineExpandedByBranch[branch]);
        return (
            <ChevronDown
                size={18}
                strokeWidth={2}
                className={`shrink-0 text-[#D4AF37]/55 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
        );
    };
}
