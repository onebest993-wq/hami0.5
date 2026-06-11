import React from 'react';
import { Ruler } from 'lucide-react';
import type { InlineActionGateKey } from '../types';
import { useExecutorDecisions } from '@/app/components/lawyer/ExecutionDashboard/hooks/useExecutorDecisions';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import {
    isExecutorHubRowSuperseded,
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
    listEvictionProcedureHubRowsForMatch,
} from '@/app/utils/executorSeizureDecisionQueue';
import { summarizeExecutorHubRequestLifecycle } from '@/app/utils/executorRequestLifecycle';
import {
    finalizeSpecificDeliveryPropertyExpertRequest,
    isSpecificDeliveryPropertyExpertDecisionRow,
    sendInitialSpecificDeliveryPropertyExpertRequest,
    SPECIFIC_DELIVERY_PROPERTY_EXPERT_TITLE,
    type SpecificDeliveryCaseExpenseRow,
} from '@/app/utils/specificDeliveryPropertyExpertRequest';
import { formatNumberInput, parseAmount } from '@/app/components/lawyer/ExecutionDashboard/utils/amountInput';
import { FollowupProcedureCard } from './FollowupProcedureCard';

export interface SpecificDeliveryPropertyExpertRequestCardProps {
    decisionsStorageExecutionId: string;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info',
        opts?: { decisionsLink?: boolean }
    ) => void;
    specificDeliveryItemName?: string;
    onExpenseRecorded?: (row: SpecificDeliveryCaseExpenseRow) => void;
}

export const SpecificDeliveryPropertyExpertRequestCard: React.FC<
    SpecificDeliveryPropertyExpertRequestCardProps
> = ({
    decisionsStorageExecutionId,
    inlineActionGateKey,
    setInlineActionGateKey,
    showToast,
    specificDeliveryItemName = '',
    onExpenseRecorded,
}) => {
    const { executionId, decisions } = useExecutorDecisions(decisionsStorageExecutionId);
    const [expanded, setExpanded] = React.useState(false);
    const [registrationOffice, setRegistrationOffice] = React.useState('');
    const [expertFeesInput, setExpertFeesInput] = React.useState('');

    const decisionRows = React.useMemo(
        () => (Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : []),
        [decisions]
    );

    const lifecycleSummary = React.useMemo(
        () =>
            summarizeExecutorHubRequestLifecycle(
                listEvictionProcedureHubRowsForMatch(decisionRows, {
                    title: SPECIFIC_DELIVERY_PROPERTY_EXPERT_TITLE,
                })
            ),
        [decisionRows]
    );

    const latestRow = React.useMemo(() => {
        const list = decisionRows;
        const hits = list
            .filter(
                (d) =>
                    isSpecificDeliveryPropertyExpertDecisionRow(d) &&
                    !isExecutorHubRowSuperseded(d)
            )
            .sort((a, b) => {
                const da = String(a?.resolvedAt ?? a?.date ?? '');
                const db = String(b?.resolvedAt ?? b?.date ?? '');
                return db.localeCompare(da, undefined, { numeric: true });
            });
        return hits[0] || null;
    }, [decisionRows]);

    const savedAt = String(latestRow?.specificDeliveryPropertyExpertSavedAt || '').trim();
    const hasRequest =
        Boolean(latestRow?.id) &&
        !isExecutorRowRejectedAndFinal(latestRow as Record<string, unknown>);

    React.useEffect(() => {
        if (hasRequest && !savedAt) setExpanded(true);
        if (savedAt) setExpanded(false);
    }, [hasRequest, savedAt, latestRow?.id]);

    React.useEffect(() => {
        if (!latestRow) return;
        const office = String(latestRow.specificDeliveryPropertyExpertOffice || '').trim();
        const fees = Number(latestRow.specificDeliveryPropertyExpertFees);
        if (office) setRegistrationOffice(office);
        if (Number.isFinite(fees) && fees > 0) setExpertFeesInput(formatNumberInput(String(fees)));
    }, [latestRow?.id, latestRow?.specificDeliveryPropertyExpertOffice, latestRow?.specificDeliveryPropertyExpertFees]);

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

    const saveDetailsAfterApproval = React.useCallback(() => {
        const decisionId = String(latestRow?.id || '').trim();
        const office = registrationOffice.trim();
        const fees = Math.trunc(parseAmount(expertFeesInput));
        if (!decisionId || !office) {
            showToast('أدخل دائرة التسجيل العقاري المختصة', 'warning');
            return;
        }
        if (fees <= 0) {
            showToast('أدخل أجور الخبير بعد تحديدها من المنفذ', 'warning');
            return;
        }
        if (!isExecutorRowEffectivelyApproved(latestRow)) {
            showToast('بانتظار موافقة المنفذ على الطلب', 'warning');
            return;
        }
        const result = finalizeSpecificDeliveryPropertyExpertRequest({
            executionId: decisionsStorageExecutionId,
            decisionId,
            registrationOffice: office,
            expertFees: fees,
            itemName: specificDeliveryItemName,
        });
        if (!result.ok) {
            showToast('تعذر حفظ بيانات الخبير', 'error');
            return;
        }
        if (result.expenseRow) onExpenseRecorded?.(result.expenseRow);
        showToast('تم حفظ الطلب — رُحِّلت أجور الخبير إلى المركز المالي (مصاريف تنفيذية).', 'success', {
            decisionsLink: true,
        });
    }, [
        decisionsStorageExecutionId,
        expertFeesInput,
        latestRow,
        onExpenseRecorded,
        registrationOffice,
        showToast,
        specificDeliveryItemName,
    ]);

    const renderAccordion = (row: Record<string, unknown> | null) => {
        if (!row?.id) return null;
        const decisionId = String(row.id || '').trim();
        const rejected = isExecutorRowRejectedAndFinal(row);
        const approved = isExecutorRowEffectivelyApproved(row);
        const pending =
            String(row.executorOutcome ?? 'pending') === 'pending' ||
            String(row.executorOutcome ?? '') === '';

        if (savedAt && approved && !rejected) {
            return null;
        }

        const steps: ExecutionInlineStep[] = [
            {
                id: `${decisionId}:sent`,
                title: SPECIFIC_DELIVERY_PROPERTY_EXPERT_TITLE,
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
                          ? 'تمت الموافقة — اكتمل الطلب'
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
                id: `${decisionId}:details`,
                title: 'بيانات الخبير',
                subtitle: 'بعد موافقة المنفذ',
                status: 'active',
                tone: 'neutral',
                content: (
                    <div className="space-y-2.5">
                        <div>
                            <label className="mb-1 block text-[10px] text-slate-400">
                                دائرة التسجيل العقاري المختصة
                            </label>
                            <input
                                type="text"
                                value={registrationOffice}
                                onChange={(e) => setRegistrationOffice(e.target.value)}
                                placeholder="مثال: دائرة التسجيل العقاري — بغداد / الكرخ"
                                dir="rtl"
                                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-white text-right focus:border-[#E6C673]/45 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-[10px] text-slate-400">
                                أجور الخبير (د.ع) — يُحدَّد من المنفذ
                            </label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={expertFeesInput}
                                onChange={(e) => setExpertFeesInput(formatNumberInput(e.target.value))}
                                placeholder="0"
                                dir="ltr"
                                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-white text-right tabular-nums focus:border-[#E6C673]/45 focus:outline-none"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={saveDetailsAfterApproval}
                            className="w-full rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-[11px] font-extrabold text-emerald-200 hover:bg-emerald-500/15"
                        >
                            حفظ الطلب وترحيل الأجور للمركز المالي
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
            label={SPECIFIC_DELIVERY_PROPERTY_EXPERT_TITLE}
            icon={
                <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 shrink-0">
                    <Ruler className="w-6 h-6 text-white/70" />
                </span>
            }
            gateKey="specific_delivery_property_expert_send"
            inlineActionGateKey={inlineActionGateKey}
            setInlineActionGateKey={setInlineActionGateKey}
            hasActiveRequest={hasRequest}
            expanded={expanded}
            onToggleExpanded={() => setExpanded((v) => !v)}
            workflowComplete={Boolean(savedAt)}
            lifecycleSummary={lifecycleSummary}
            resubmitWarningMessage="سبق واتخاذ طلب انتداب الخبير سابقاً. يمكنك تقديم طلب جديد أو التراجع."
            onConfirmSend={({ resubmit } = {}) => {
                const result = sendInitialSpecificDeliveryPropertyExpertRequest({
                    executionId: decisionsStorageExecutionId,
                    itemName: specificDeliveryItemName,
                    supersedeCompletedHub: resubmit,
                });
                if (!result.ok) {
                    showToast('يوجد طلب قيد البت لدى المنفذ.', 'warning');
                    return;
                }
                showToast(
                    resubmit
                        ? 'تم تقديم طلب جديد إلى مركز قرارات المنفذ.'
                        : 'تم إرسال الطلب إلى مركز قرارات المنفذ.',
                    'success',
                    { decisionsLink: true }
                );
            }}
            panelBody={renderAccordion(latestRow)}
        />
    );
};
