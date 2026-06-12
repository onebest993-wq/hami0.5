import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { InlineActionGateKey } from '../types';
import { useExecutorDecisions } from '@/app/components/lawyer/ExecutionDashboard/hooks/useExecutorDecisions';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import {
    isExecutorRowRejectedAndFinal,
    listEvictionProcedureHubRowsForMatch,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import { summarizeExecutorHubRequestLifecycle } from '@/app/utils/executorRequestLifecycle';
import {
    finalizeSpecificDeliveryConversionRequest,
    isSpecificDeliveryConversionDecisionRow,
    sendInitialSpecificDeliveryConversionRequest,
    SPECIFIC_DELIVERY_CONVERSION_TITLE,
} from '@/app/utils/specificDeliveryConversionRequest';
import { formatNumberInput, parseAmount } from '@/app/components/lawyer/ExecutionDashboard/utils/amountInput';
import { FollowupProcedureCard } from './FollowupProcedureCard';

export interface SpecificDeliveryConversionRequestCardProps {
    decisionsStorageExecutionId: string;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info',
        opts?: { decisionsLink?: boolean }
    ) => void;
    specificDeliveryItemName?: string;
    specificDeliveryFinancialized?: boolean;
    onConversionFinancialized?: (amount: number) => void;
    showDirectCashConversion?: boolean;
}

export const SpecificDeliveryConversionRequestCard: React.FC<
    SpecificDeliveryConversionRequestCardProps
> = ({
    decisionsStorageExecutionId,
    inlineActionGateKey,
    setInlineActionGateKey,
    showToast,
    specificDeliveryItemName = '',
    specificDeliveryFinancialized = false,
    onConversionFinancialized,
    showDirectCashConversion = true,
}) => {
    const { executionId, decisions } = useExecutorDecisions(decisionsStorageExecutionId);
    const [expanded, setExpanded] = React.useState(false);
    const [cashValueInput, setCashValueInput] = React.useState('');

    const decisionRows = React.useMemo(
        () => (Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : []),
        [decisions]
    );

    const lifecycleSummary = React.useMemo(
        () =>
            summarizeExecutorHubRequestLifecycle(
                listEvictionProcedureHubRowsForMatch(decisionRows, {
                    title: SPECIFIC_DELIVERY_CONVERSION_TITLE,
                })
            ),
        [decisionRows]
    );

    const latestRow = React.useMemo(() => {
        const list = decisionRows;
        const hits = list
            .filter((d) => isSpecificDeliveryConversionDecisionRow(d))
            .sort((a, b) => {
                const da = String(a?.resolvedAt ?? a?.date ?? '');
                const db = String(b?.resolvedAt ?? b?.date ?? '');
                return db.localeCompare(da, undefined, { numeric: true });
            });
        return hits[0] || null;
    }, [decisionRows]);

    const hasRequest = Boolean(latestRow?.id);
    const workflowComplete = specificDeliveryFinancialized;

    React.useEffect(() => {
        if (hasRequest) setExpanded(true);
    }, [hasRequest, latestRow?.id]);

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

    const saveCashValueAfterApproval = React.useCallback(() => {
        const decisionId = String(latestRow?.id || '').trim();
        const amount = Math.trunc(parseAmount(cashValueInput));
        if (!decisionId || amount <= 0) {
            showToast('أدخل قيمة نقدية صحيحة للشيء', 'warning');
            return;
        }
        if (!isExecutorRowApprovedWorkflowActive(latestRow, decisionRows)) {
            showToast('بانتظار موافقة المنفذ على الطلب', 'warning');
            return;
        }
        const result = finalizeSpecificDeliveryConversionRequest({
            executionId: decisionsStorageExecutionId,
            decisionId,
            cashValue: amount,
            itemName: specificDeliveryItemName,
        });
        if (!result.ok || !result.amount) {
            showToast('تعذر حفظ بيانات التحويل', 'error');
            return;
        }
        onConversionFinancialized?.(result.amount);
        setCashValueInput('');
        showToast(
            'تم تحويل المطالبة مالياً — رُحِّل المبلغ إلى المركز المالي وطلبات الحجز.',
            'success',
            { decisionsLink: true }
        );
    }, [
        cashValueInput,
        decisionsStorageExecutionId,
        latestRow,
        onConversionFinancialized,
        showToast,
        specificDeliveryItemName,
    ]);

    const renderPanel = (row: Record<string, unknown> | null) => {
        if (!row?.id || specificDeliveryFinancialized) return null;
        const decisionId = String(row.id || '').trim();
        const rejected = isExecutorRowRejectedAndFinal(row);
        const approved = isExecutorRowApprovedWorkflowActive(row, decisionRows);
        const pending =
            String(row.executorOutcome ?? 'pending') === 'pending' ||
            String(row.executorOutcome ?? '') === '';

        const steps: ExecutionInlineStep[] = [
            {
                id: `${decisionId}:sent`,
                title: SPECIFIC_DELIVERY_CONVERSION_TITLE,
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

        if (showDirectCashConversion && approved && !rejected && !specificDeliveryFinancialized) {
            steps.push({
                id: `${decisionId}:cash`,
                title: 'القيمة النقدية للشيء',
                subtitle: 'بعد موافقة المنفذ',
                status: 'active',
                tone: 'neutral',
                content: (
                    <div className="space-y-2.5">
                        <input
                            type="text"
                            inputMode="decimal"
                            value={cashValueInput}
                            onChange={(e) => setCashValueInput(formatNumberInput(e.target.value))}
                            placeholder="0"
                            dir="ltr"
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-white text-right tabular-nums focus:border-[#E6C673]/45 focus:outline-none"
                        />
                        <button
                            type="button"
                            onClick={saveCashValueAfterApproval}
                            className="w-full rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-[11px] font-extrabold text-emerald-200 hover:bg-emerald-500/15"
                        >
                            حفظ وتحويل المطالبة مالياً
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

    if (specificDeliveryFinancialized) return null;

    return (
        <FollowupProcedureCard
            label={SPECIFIC_DELIVERY_CONVERSION_TITLE}
            toneClass="border-amber-500/20 hover:border-amber-500/40"
            icon={
                <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-amber-500/10 shrink-0">
                    <AlertTriangle className="w-6 h-6 text-amber-300" />
                </span>
            }
            gateKey="specific_delivery_conversion_send"
            inlineActionGateKey={inlineActionGateKey}
            setInlineActionGateKey={setInlineActionGateKey}
            hasActiveRequest={hasRequest}
            expanded={expanded}
            onToggleExpanded={() => setExpanded((v) => !v)}
            workflowComplete={workflowComplete}
            lifecycleSummary={lifecycleSummary}
            onConfirmSend={() => {
                const result = sendInitialSpecificDeliveryConversionRequest({
                    executionId: decisionsStorageExecutionId,
                });
                if (!result.ok) {
                    showToast('تعذر إرسال الطلب', 'error');
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
