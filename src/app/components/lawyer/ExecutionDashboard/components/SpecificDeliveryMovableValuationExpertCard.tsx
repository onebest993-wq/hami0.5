import React from 'react';
import { Scale } from 'lucide-react';
import type { InlineActionGateKey } from '../types';
import { useExecutorDecisions } from '@/app/components/lawyer/ExecutionDashboard/hooks/useExecutorDecisions';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import {
    isExecutorHubRowSuperseded,
    isExecutorRowRejectedAndFinal,
    listEvictionProcedureHubRowsForMatch,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import { summarizeExecutorHubRequestLifecycle } from '@/app/utils/executorRequestLifecycle';
import {
    finalizeSpecificDeliveryMovableValuationRequest,
    isSpecificDeliveryMovableValuationDecisionRow,
    sendInitialSpecificDeliveryMovableValuationRequest,
    SPECIFIC_DELIVERY_MOVABLE_VALUATION_TITLE,
} from '@/app/utils/specificDeliveryMovableValuationRequest';
import type { SpecificDeliveryCaseExpenseRow } from '@/app/utils/specificDeliveryPropertyExpertRequest';
import { formatNumberInput, parseAmount } from '@/app/components/lawyer/ExecutionDashboard/utils/amountInput';
import { FollowupProcedureCard } from './FollowupProcedureCard';

export interface SpecificDeliveryMovableValuationExpertCardProps {
    decisionsStorageExecutionId: string;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info',
        opts?: { decisionsLink?: boolean }
    ) => void;
    specificDeliveryItemName?: string;
    specificDeliveryItemDescription?: string;
    onExpenseRecorded?: (row: SpecificDeliveryCaseExpenseRow) => void;
    onValuationFinancialized?: (amount: number) => void;
}

export const SpecificDeliveryMovableValuationExpertCard: React.FC<
    SpecificDeliveryMovableValuationExpertCardProps
> = ({
    decisionsStorageExecutionId,
    inlineActionGateKey,
    setInlineActionGateKey,
    showToast,
    specificDeliveryItemName = '',
    specificDeliveryItemDescription = '',
    onExpenseRecorded,
    onValuationFinancialized,
}) => {
    const { executionId, decisions } = useExecutorDecisions(decisionsStorageExecutionId);
    const defaultDesc = specificDeliveryItemDescription || specificDeliveryItemName;
    const [expanded, setExpanded] = React.useState(false);
    const [itemDescription, setItemDescription] = React.useState(defaultDesc);
    const [expertFeesInput, setExpertFeesInput] = React.useState('');
    const [estimatedValueInput, setEstimatedValueInput] = React.useState('');

    const decisionRows = React.useMemo(
        () => (Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : []),
        [decisions]
    );

    const lifecycleSummary = React.useMemo(
        () =>
            summarizeExecutorHubRequestLifecycle(
                listEvictionProcedureHubRowsForMatch(decisionRows, {
                    title: SPECIFIC_DELIVERY_MOVABLE_VALUATION_TITLE,
                })
            ),
        [decisionRows]
    );

    const latestRow = React.useMemo(() => {
        const list = decisionRows;
        const hits = list
            .filter(
                (d) =>
                    isSpecificDeliveryMovableValuationDecisionRow(d) &&
                    !isExecutorHubRowSuperseded(d)
            )
            .sort((a, b) => {
                const da = String(a?.resolvedAt ?? a?.date ?? '');
                const db = String(b?.resolvedAt ?? b?.date ?? '');
                return db.localeCompare(da, undefined, { numeric: true });
            });
        return hits[0] || null;
    }, [decisionRows]);

    const savedAt = String(latestRow?.specificDeliveryMovableValuationSavedAt || '').trim();
    const hasRequest =
        Boolean(latestRow?.id) &&
        !isExecutorRowRejectedAndFinal(latestRow as Record<string, unknown>);

    React.useEffect(() => {
        if (hasRequest && !savedAt) setExpanded(true);
        if (savedAt) setExpanded(false);
    }, [hasRequest, savedAt, latestRow?.id]);

    React.useEffect(() => {
        if (!defaultDesc) return;
        setItemDescription((prev) => (prev.trim() ? prev : defaultDesc));
    }, [defaultDesc]);

    React.useEffect(() => {
        if (!latestRow) return;
        const desc = String(latestRow.specificDeliveryMovableValuationDescription || '').trim();
        const fees = Number(latestRow.specificDeliveryMovableValuationFees);
        const value = Number(latestRow.specificDeliveryMovableValuationAmount);
        if (desc) setItemDescription(desc);
        if (Number.isFinite(fees) && fees > 0) setExpertFeesInput(formatNumberInput(String(fees)));
        if (Number.isFinite(value) && value > 0) setEstimatedValueInput(formatNumberInput(String(value)));
    }, [
        latestRow?.id,
        latestRow?.specificDeliveryMovableValuationDescription,
        latestRow?.specificDeliveryMovableValuationFees,
        latestRow?.specificDeliveryMovableValuationAmount,
    ]);

    const openAppeals = React.useCallback(
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

    const saveValuationAfterApproval = React.useCallback(() => {
        const decisionId = String(latestRow?.id || '').trim();
        const desc = itemDescription.trim();
        const fees = Math.trunc(parseAmount(expertFeesInput));
        const value = Math.trunc(parseAmount(estimatedValueInput));
        if (!decisionId || !desc) {
            showToast('أدخل وصف الشيء المراد تقديره', 'warning');
            return;
        }
        if (fees <= 0) {
            showToast('أدخل أجور الخبير التقديرية', 'warning');
            return;
        }
        if (value <= 0) {
            showToast('أدخل القيمة المقدرة للشيء', 'warning');
            return;
        }
        if (!isExecutorRowApprovedWorkflowActive(latestRow, decisionRows)) {
            showToast('بانتظار موافقة المنفذ على الطلب', 'warning');
            return;
        }
        const result = finalizeSpecificDeliveryMovableValuationRequest({
            executionId: decisionsStorageExecutionId,
            decisionId,
            itemDescription: desc,
            expertFees: fees,
            estimatedValue: value,
        });
        if (!result.ok || !result.estimatedValue) {
            showToast('تعذر حفظ بيانات التقدير', 'error');
            return;
        }
        if (result.expenseRow) onExpenseRecorded?.(result.expenseRow);
        onValuationFinancialized?.(result.estimatedValue);
        showToast(
            'تم التقدير — رُحِّلت الأجور كمصاريف تنفيذية وحقنت القيمة المقدرة في المركز المالي.',
            'success',
            { decisionsLink: true }
        );
    }, [
        decisionsStorageExecutionId,
        estimatedValueInput,
        expertFeesInput,
        itemDescription,
        latestRow,
        onExpenseRecorded,
        onValuationFinancialized,
        showToast,
    ]);

    const renderPanel = (row: Record<string, unknown> | null) => {
        if (!row?.id) return null;
        const decisionId = String(row.id || '').trim();
        const rejected = isExecutorRowRejectedAndFinal(row);
        const approved = isExecutorRowApprovedWorkflowActive(row, decisionRows);
        const pending =
            String(row.executorOutcome ?? 'pending') === 'pending' ||
            String(row.executorOutcome ?? '') === '';

        if (savedAt && approved && !rejected) {
            return null;
        }

        const steps: ExecutionInlineStep[] = [
            {
                id: `${decisionId}:sent`,
                title: SPECIFIC_DELIVERY_MOVABLE_VALUATION_TITLE,
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
                      ? savedAt
                          ? 'تمت الموافقة — اكتمل التقدير'
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
                        requestKind="special_followup"
                        disabled
                        onOpenAppealCenter={() => openAppeals(decisionId)}
                    />
                ) : pending ? (
                    <ExecutionInlineExecutorDecisionActions
                        executionId={executionId}
                        decisionId={decisionId}
                        requestKind="special_followup"
                    />
                ) : null,
            },
        ];

        if (approved && !rejected && !savedAt) {
            steps.push({
                id: `${decisionId}:valuation`,
                title: 'بيانات خبير التقدير',
                subtitle: 'بعد موافقة المنفذ',
                status: 'active',
                tone: 'neutral',
                content: (
                    <div className="space-y-2.5">
                        <input
                            type="text"
                            value={itemDescription}
                            onChange={(e) => setItemDescription(e.target.value)}
                            placeholder="يُسحب من معلومات الإضبارة"
                            dir="rtl"
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-white text-right focus:border-[#E6C673]/45 focus:outline-none"
                        />
                        <input
                            type="text"
                            inputMode="decimal"
                            value={expertFeesInput}
                            onChange={(e) => setExpertFeesInput(formatNumberInput(e.target.value))}
                            placeholder="أجور الخبير (د.ع)"
                            dir="ltr"
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-white text-right tabular-nums focus:border-[#E6C673]/45 focus:outline-none"
                        />
                        <input
                            type="text"
                            inputMode="decimal"
                            value={estimatedValueInput}
                            onChange={(e) => setEstimatedValueInput(formatNumberInput(e.target.value))}
                            placeholder="القيمة المقدرة (د.ع)"
                            dir="ltr"
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-white text-right tabular-nums focus:border-[#E6C673]/45 focus:outline-none"
                        />
                        <button
                            type="button"
                            onClick={saveValuationAfterApproval}
                            className="w-full rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-[11px] font-extrabold text-emerald-200 hover:bg-emerald-500/15"
                        >
                            حفظ التقدير وتحويل المطالبة مالياً
                        </button>
                    </div>
                ),
            });
        }

        return (
            <div className="px-3 pb-3 pt-2" dir="rtl">
                <ExecutionInlineAccordion steps={steps} />
            </div>
        );
    };

    return (
        <FollowupProcedureCard
            label={SPECIFIC_DELIVERY_MOVABLE_VALUATION_TITLE}
            toneClass="border-amber-500/20 hover:border-amber-500/40"
            icon={
                <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-amber-500/10 shrink-0">
                    <Scale className="w-6 h-6 text-amber-300" />
                </span>
            }
            gateKey="specific_delivery_movable_valuation_send"
            inlineActionGateKey={inlineActionGateKey}
            setInlineActionGateKey={setInlineActionGateKey}
            hasActiveRequest={hasRequest}
            expanded={expanded}
            onToggleExpanded={() => setExpanded((v) => !v)}
            workflowComplete={Boolean(savedAt)}
            lifecycleSummary={lifecycleSummary}
            resubmitWarningMessage="سبق واتخاذ طلب التقدير سابقاً. يمكنك تقديم طلب جديد أو التراجع."
            onConfirmSend={({ resubmit } = {}) => {
                const result = sendInitialSpecificDeliveryMovableValuationRequest({
                    executionId: decisionsStorageExecutionId,
                    itemDescription: defaultDesc,
                    supersedeCompletedHub: resubmit,
                });
                if (!result.ok) {
                    showToast('يوجد طلب قيد البت لدى المنفذ.', 'warning');
                    return;
                }
                showToast('تم إرسال الطلب إلى مركز قرارات المنفذ.', 'success', {
                    decisionsLink: true,
                });
            }}
            panelBody={renderPanel(latestRow)}
        />
    );
};
