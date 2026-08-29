import React from 'react';
import { Hammer } from '@/app/components/ui/icons/Hammer';
import { InlineActionGate } from './InlineActionGate';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import {
    appendEvictionExecutorRequest,
    dispatchDecisionsReload,
    isExecutorRowRejectedAndFinal,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import {
    HIDDEN_BREAK_INVENTORY_REQUEST_BODY,
    HIDDEN_BREAK_INVENTORY_REQUEST_TITLE,
    resolveHiddenBreakInventoryRequest,
    type HiddenFollowupVisibilityInput,
} from './hiddenFollowupRequestsUtils';
import {
    HIDDEN_FOLLOWUP_PENDING_REASON,
    HiddenFollowupDecisionsFollowupButton,
    HiddenFollowupDetailPanel,
    HiddenFollowupStatusLabel,
    HiddenFollowupSubmitButton,
    openHiddenFollowupSubmitOrWarn,
    resolveHiddenFollowupLockedReason,
} from './hiddenFollowup/shared';

export interface HiddenBreakInventoryRequestOptionsProps {
    executionId: string;
    flags: HiddenFollowupVisibilityInput;
    decisions: Record<string, unknown>[];
    coerciveUiLocked: boolean;
    isHistoricalMode: boolean;
    /** داخل قائمة موحّدة — بدون عناوين مكررة */
    embedded?: boolean;
    showToast: (
        message: string,
        type?: 'success' | 'error' | 'warning' | 'info',
        opts?: { decisionsLink?: boolean; decisionId?: string; decisionsTab?: 'current' | 'previous' | 'appeals' }
    ) => void;
    onOpenDecisions: (opts?: {
        tab?: 'current' | 'previous' | 'appeals';
        decisionId?: string | null;
    }) => void;
}

export const HiddenBreakInventoryRequestOptions: React.FC<HiddenBreakInventoryRequestOptionsProps> = ({
    executionId,
    flags,
    decisions,
    coerciveUiLocked,
    isHistoricalMode,
    embedded = false,
    showToast,
    onOpenDecisions,
}) => {
    const exId = String(executionId || '').trim();
    const [inlineGateKey, setInlineGateKey] = React.useState<'hidden_break_inventory' | null>(null);
    const [submitting, setSubmitting] = React.useState(false);

    const resolved = React.useMemo(
        () => resolveHiddenBreakInventoryRequest(decisions),
        [decisions]
    );

    const submitDisabledReason = React.useMemo(() => {
        const locked = resolveHiddenFollowupLockedReason(isHistoricalMode, coerciveUiLocked);
        if (locked) return locked;
        if (resolved.status === 'pending') return HIDDEN_FOLLOWUP_PENDING_REASON;
        if (resolved.resendBlocked && !resolved.workflowComplete) {
            return 'الطلب موافق عليه — أكمل الإجراء من القرارات أولاً.';
        }
        return '';
    }, [coerciveUiLocked, isHistoricalMode, resolved]);

    const runSubmit = React.useCallback(
        (resubmit?: boolean) => {
        if (!exId || isHistoricalMode || coerciveUiLocked) return;
        if (resolved.status === 'pending') return;
        if (resolved.resendBlocked && !resubmit) return;
        setSubmitting(true);
        try {
            const ok = appendEvictionExecutorRequest({
                executionId: exId,
                title: HIDDEN_BREAK_INVENTORY_REQUEST_TITLE,
                body: HIDDEN_BREAK_INVENTORY_REQUEST_BODY,
                requestKind: 'eviction_procedure',
                evictionWorkflowKey: 'break_inventory',
                supersedeCompletedHub: resubmit,
            });
            if (!ok) {
                showToast('يوجد طلب مماثل لدى المنفذ.', 'warning', { decisionsLink: true });
                return;
            }
            dispatchDecisionsReload();
            showToast('تم حفظ الطلب وتحويله إلى مركز القرارات بانتظار موافقة المنفذ.', 'success', {
                decisionsLink: true,
            });
        } finally {
            setSubmitting(false);
            setInlineGateKey(null);
        }
    },
        [coerciveUiLocked, exId, isHistoricalMode, resolved.resendBlocked, resolved.status, showToast]
    );

    const finalizeBreakInventory = React.useCallback(() => {
        const decisionId = String(resolved.row?.id || '').trim();
        if (!decisionId) return;
        const ok = patchExecutorDecisionRow(exId, decisionId, {
            breakInventoryFurnitureFinalizedAt: new Date().toISOString(),
        });
        if (!ok) {
            showToast('تعذر تأكيد الإجراء', 'error');
            return;
        }
        dispatchDecisionsReload();
        showToast('تم تأكيد اكتمال كسر الأقفال.', 'success');
    }, [exId, resolved.row?.id, showToast]);

    const steps: ExecutionInlineStep[] = React.useMemo(() => {
        const row = resolved.row;
        if (!row?.id) return [];
        const decisionId = String(row.id || '').trim();
        const rejected = isExecutorRowRejectedAndFinal(row);
        const pending =
            String(row.executorOutcome ?? 'pending') === 'pending' ||
            String(row.executorOutcome ?? '') === '';
        const approved = isExecutorRowApprovedWorkflowActive(row, decisions) && !rejected;
        const needsFinalize =
            approved &&
            !resolved.workflowComplete &&
            !String((row as { breakInventoryFurnitureFinalizedAt?: string }).breakInventoryFurnitureFinalizedAt || '').trim();

        return [
            {
                id: 'hidden-break:sent',
                title: HIDDEN_BREAK_INVENTORY_REQUEST_TITLE,
                subtitle: 'تم إرسال الطلب',
                status: 'done',
                tone: 'success',
            },
            {
                id: 'hidden-break:executor',
                title: 'قرار المنفذ',
                subtitle: rejected
                    ? 'تم رفض الطلب'
                    : resolved.workflowComplete
                      ? 'تمت الموافقة — اكتمل الإجراء'
                      : approved
                        ? 'تمت الموافقة'
                        : pending
                          ? 'قيد البت'
                          : '—',
                status: rejected || pending ? 'active' : 'done',
                tone: rejected ? 'danger' : approved ? 'success' : 'neutral',
                content: pending ? (
                    <ExecutionInlineExecutorDecisionActions
                        executionId={exId}
                        decisionId={decisionId}
                        requestKind="eviction_procedure"
                    />
                ) : needsFinalize ? (
                    <button
                        type="button"
                        onClick={finalizeBreakInventory}
                        className="w-full rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-[11px] font-extrabold text-emerald-200 hover:bg-emerald-500/15"
                    >
                        تأكيد اكتمال كسر الأقفال
                    </button>
                ) : approved ? (
                    <HiddenFollowupDecisionsFollowupButton
                        label="متابعة في القرارات"
                        onClick={() => onOpenDecisions({ tab: 'previous', decisionId })}
                    />
                ) : undefined,
            },
        ];
    }, [exId, finalizeBreakInventory, onOpenDecisions, resolved.row, resolved.workflowComplete]);

    if (!flags.showHiddenBreakInventoryRequest) return null;

    const panel = (
        <HiddenFollowupDetailPanel>
            {!embedded ? (
                <div className="flex flex-row-reverse items-center gap-3 text-right">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5">
                        <Hammer className="h-5 w-5 text-white/70" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-slate-100">
                            {HIDDEN_BREAK_INVENTORY_REQUEST_TITLE}
                        </p>
                        <p className="mt-0.5 text-[9px] text-slate-400">{resolved.statusLabel}</p>
                    </div>
                </div>
            ) : (
                <HiddenFollowupStatusLabel>{resolved.statusLabel}</HiddenFollowupStatusLabel>
            )}

            {resolved.status !== 'pending' ? (
                <div className="relative">
                    <HiddenFollowupSubmitButton
                        disabled={Boolean(submitDisabledReason) || submitting}
                        label={
                            resolved.workflowComplete
                                ? 'تقديم طلب جديد'
                                : 'إرسال الطلب إلى المنفذ'
                        }
                        onClick={() =>
                            openHiddenFollowupSubmitOrWarn(submitDisabledReason, showToast, () =>
                                setInlineGateKey('hidden_break_inventory')
                            )
                        }
                    />
                    {inlineGateKey === 'hidden_break_inventory' ? (
                        <InlineActionGate
                            gateKey="hidden_break_inventory"
                            activeKey={inlineGateKey}
                            mode={resolved.workflowComplete ? 'resubmit_warning' : 'initial'}
                            warningMessage="سبق واتخاذ طلب كسر الأقفال سابقاً. يمكنك تقديم طلب جديد أو التراجع."
                            onConfirm={() => runSubmit(resolved.workflowComplete)}
                            onCancel={() => setInlineGateKey(null)}
                        />
                    ) : null}
                </div>
            ) : null}

            {resolved.row && steps.length > 0 ? <ExecutionInlineAccordion steps={steps} /> : null}
        </HiddenFollowupDetailPanel>
    );

    if (embedded) {
        return panel;
    }

    return (
        <div className="space-y-3 border-t border-white/8 pt-3">
            <p className="text-[9px] font-bold text-emerald-300/75">إجراء ميداني مخفي</p>
            {panel}
        </div>
    );
};
