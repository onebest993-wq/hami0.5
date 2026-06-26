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
import {
    isExecutorRowApprovedWorkflowActive,
    resolveExecutorRequestAppealSyncFromRow,
} from '@/app/utils/executorRequestAppealSync';
import { summarizeExecutorHubRequestLifecycle } from '@/app/utils/executorRequestLifecycle';
import {
    applySpecificDeliveryMovableExpertObjection,
    finalizeSpecificDeliveryMovableValuationRequest,
    isSpecificDeliveryMovableValuationDecisionRow,
    saveSpecificDeliveryMovableExpertReport,
    sendInitialSpecificDeliveryMovableValuationRequest,
    SPECIFIC_DELIVERY_MOVABLE_VALUATION_TITLE,
} from '@/app/utils/specificDeliveryMovableValuationRequest';
import type { SpecificDeliveryCaseExpenseRow } from '@/app/utils/specificDeliveryPropertyExpertRequest';
import {
    parseSpecificDeliveryConversionPayload,
    isSpecificDeliveryConversionDecisionRow,
} from '@/app/utils/specificDeliveryConversionRequest';
import {
    readSpecificDeliveryItems,
    type SpecificDeliveryItem,
} from '@/app/utils/specificDeliveryItemsUtils';
import { formatNumberInput, parseAmount } from '@/app/components/lawyer/ExecutionDashboard/utils/amountInput';
import {
    expertCommitteeSizeLabelAr,
    readExpertCommitteeSize,
} from '@/app/components/lawyer/ExecutionDashboard/utils/expertCommitteeUtils';
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
    specificDeliveryItems?: SpecificDeliveryItem[] | null;
    onExpenseRecorded?: (row: SpecificDeliveryCaseExpenseRow) => void;
    onValuationFinancialized?: (amount: number, itemId?: string) => void;
    hasPendingDeliveryItems?: boolean;
}

function buildExpertNameSlots(
    row: Record<string, unknown> | null,
    required: number
): string[] {
    const names = Array.isArray(row?.expertNames)
        ? row!.expertNames!.map((x) => String(x || '').trim())
        : [];
    return Array.from({ length: required }, (_, i) => names[i] || '');
}

export const SpecificDeliveryMovableValuationExpertCard: React.FC<
    SpecificDeliveryMovableValuationExpertCardProps
> = ({
    decisionsStorageExecutionId,
    inlineActionGateKey,
    setInlineActionGateKey,
    showToast,
    specificDeliveryItemName = '',
    specificDeliveryItems = null,
    onExpenseRecorded,
    onValuationFinancialized,
    hasPendingDeliveryItems = false,
}) => {
    const { executionId, decisions } = useExecutorDecisions(decisionsStorageExecutionId);
    const [expanded, setExpanded] = React.useState(false);
    const [estimatedValueInput, setEstimatedValueInput] = React.useState('');
    const [expertNames, setExpertNames] = React.useState('');
    const [expertNameSlots, setExpertNameSlots] = React.useState<string[]>(['']);
    const [partyDecisionLane, setPartyDecisionLane] = React.useState<'choose' | 'approve' | 'objection'>(
        'choose'
    );

    const allItems = React.useMemo(
        () =>
            Array.isArray(specificDeliveryItems) && specificDeliveryItems.length > 0
                ? specificDeliveryItems
                : readSpecificDeliveryItems({ specificDeliveryItemName, specificDeliveryItems }),
        [specificDeliveryItemName, specificDeliveryItems]
    );

    const decisionRows = React.useMemo(
        () => (Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : []),
        [decisions]
    );

    const linkedConversionItem = React.useMemo(() => {
        const conversionRow = decisionRows.find(
            (row) =>
                isSpecificDeliveryConversionDecisionRow(row) &&
                !isExecutorHubRowSuperseded(row) &&
                !isExecutorRowRejectedAndFinal(row) &&
                (Boolean(String(row.specificDeliveryConversionSavedAt || '').trim()) ||
                    isExecutorRowApprovedWorkflowActive(row, decisionRows))
        );
        const payload = parseSpecificDeliveryConversionPayload(conversionRow ?? null);
        if (payload.itemId) {
            const hit = allItems.find((item) => item.id === payload.itemId);
            if (hit) return hit;
        }
        if (payload.itemName) {
            const hit = allItems.find((item) => item.name === payload.itemName);
            if (hit) return hit;
        }
        return allItems.find((item) => item.nature === 'movable' && item.declaredDestroyed && item.status === 'pending') ?? null;
    }, [allItems, decisionRows]);

    const valuedItemLabel = String(linkedConversionItem?.name || specificDeliveryItemName || '').trim();

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
        const hits = decisionRows
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
    const reportSavedAt = String(latestRow?.specificDeliveryMovableValuationReportSavedAt || '').trim();
    const requiredExperts = readExpertCommitteeSize(latestRow || {});
    const hasRequest =
        Boolean(latestRow?.id) &&
        !isExecutorRowRejectedAndFinal(latestRow as Record<string, unknown>) &&
        !savedAt;
    const executorApproved =
        Boolean(latestRow?.id) &&
        isExecutorRowApprovedWorkflowActive(latestRow as Record<string, unknown>, decisionRows) &&
        !savedAt;

    React.useEffect(() => {
        if (hasRequest) setExpanded(true);
        if (savedAt) setExpanded(false);
    }, [hasRequest, savedAt, latestRow?.id]);

    React.useEffect(() => {
        if (!latestRow) return;
        const value = Number(latestRow.specificDeliveryMovableValuationAmount);
        if (Number.isFinite(value) && value > 0) {
            setEstimatedValueInput(formatNumberInput(String(value)));
        }
        const joined = buildExpertNameSlots(latestRow, requiredExperts).filter(Boolean).join('، ');
        if (joined) setExpertNames(joined);
    }, [latestRow, requiredExperts]);

    React.useEffect(() => {
        setExpertNameSlots(buildExpertNameSlots(latestRow, requiredExperts));
    }, [latestRow?.id, requiredExperts]);

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

    const expertNamesForSave = React.useCallback((): string[] => {
        if (requiredExperts <= 1) {
            return String(expertNames || '')
                .split(/[,،]/)
                .map((x) => x.trim())
                .filter(Boolean);
        }
        return expertNameSlots.map((slot) => String(slot || '').trim()).filter(Boolean);
    }, [expertNameSlots, expertNames, requiredExperts]);

    React.useEffect(() => {
        if (reportSavedAt) setPartyDecisionLane('choose');
    }, [reportSavedAt, latestRow?.id, requiredExperts]);

    const saveExpertReport = React.useCallback(() => {
        const decisionId = String(latestRow?.id || '').trim();
        const desc = valuedItemLabel;
        const value = Math.trunc(parseAmount(estimatedValueInput));
        const names = expertNamesForSave();
        if (!decisionId || !desc) {
            showToast('لا يوجد شيء منقول مرتبط بطلب التحويل المعتمد', 'warning');
            return;
        }
        if (names.length !== requiredExperts) {
            showToast(
                `يجب إدخال ${requiredExperts} ${requiredExperts === 1 ? 'خبير' : 'خبراء'} بالضبط (${expertCommitteeSizeLabelAr(requiredExperts)}).`,
                'warning'
            );
            return;
        }
        if (value <= 0) {
            showToast('أدخل القيمة المقدرة للشيء', 'warning');
            return;
        }
        if (!isExecutorRowApprovedWorkflowActive(latestRow, decisionRows)) {
            showToast('بانتظار موافقة المنفذ على طلب الانتداب', 'warning');
            return;
        }
        const result = saveSpecificDeliveryMovableExpertReport({
            executionId: decisionsStorageExecutionId,
            decisionId,
            itemDescription: desc,
            expertNames: names,
            expertCommitteeSize: requiredExperts,
            expertFees: 0,
            estimatedValue: value,
        });
        if (!result.ok) {
            showToast('تعذر حفظ تقرير الخبراء', 'error');
            return;
        }
        setPartyDecisionLane('choose');
        showToast('تم حفظ تقرير الخبراء — اختر اعتماد التقرير أو الاعتراض.', 'success', {
            decisionsLink: true,
        });
    }, [
        decisionsStorageExecutionId,
        decisionRows,
        expertNamesForSave,
        estimatedValueInput,
        latestRow,
        requiredExperts,
        showToast,
        valuedItemLabel,
    ]);

    const submitExpertObjection = React.useCallback(
        (objectionKind: 'report' | 'experts') => {
            const decisionId = String(latestRow?.id || '').trim();
            if (!decisionId) return;
            const result = applySpecificDeliveryMovableExpertObjection({
                executionId: decisionsStorageExecutionId,
                decisionId,
                objectionKind,
            });
            if (!result.ok) {
                showToast('تعذر تسجيل الاعتراض', 'error');
                return;
            }
            setEstimatedValueInput('');
            setExpertNames('');
            setExpertNameSlots(
                Array.from({ length: result.committeeSize ?? requiredExperts + 2 }, () => '')
            );
            setPartyDecisionLane('choose');
            showToast(
                `تم تسجيل الاعتراض — ${expertCommitteeSizeLabelAr(result.committeeSize ?? 3)}. أكمل تقرير اللجنة الجديدة.`,
                'warning',
                { decisionsLink: true }
            );
        },
        [decisionsStorageExecutionId, latestRow?.id, requiredExperts, showToast]
    );

    const financializeAfterReportApproval = React.useCallback(() => {
        const decisionId = String(latestRow?.id || '').trim();
        const desc = valuedItemLabel;
        const savedReportValue = Math.trunc(
            Number(latestRow?.specificDeliveryMovableValuationAmount) || 0
        );
        const value =
            Math.trunc(parseAmount(estimatedValueInput)) ||
            savedReportValue;
        const itemId = linkedConversionItem?.id;
        if (!decisionId || !reportSavedAt) {
            showToast('احفظ تقرير الخبراء أولاً', 'warning');
            return;
        }
        if (value <= 0) {
            showToast('أدخل القيمة المقدرة في تقرير الخبراء أولاً', 'warning');
            return;
        }
        if (!isExecutorRowApprovedWorkflowActive(latestRow, decisionRows)) {
            showToast('بانتظار موافقة المنفذ على انتداب الخبير', 'warning');
            return;
        }
        const confirmMsg = hasPendingDeliveryItems
            ? 'تذكير: لا يُخفى قسم إجراءات التسليم/المخاطبات حتى تسليم أو هلاك جميع الأشياء المراد تسليمها. إن بقي شيء لم يُسلَّم أو يُهلَك فسيظل القسم ظاهراً.\n\nهل تريد اعتماد التقرير وتحويل القيمة للمركز المالي؟'
            : 'هل تريد اعتماد التقرير وتحويل القيمة للمركز المالي؟';
        if (!window.confirm(confirmMsg)) return;
        const result = finalizeSpecificDeliveryMovableValuationRequest({
            executionId: decisionsStorageExecutionId,
            decisionId,
            itemDescription: desc,
            expertFees: 0,
            estimatedValue: value,
        });
        if (!result.ok || !result.estimatedValue) {
            showToast('تعذر تحويل القيمة إلى المركز المالي', 'error');
            return;
        }
        if (result.expenseRow) onExpenseRecorded?.(result.expenseRow);
        onValuationFinancialized?.(result.estimatedValue, itemId);
        showToast('تم اعتماد التقرير وحقن القيمة المقدرة في المركز المالي.', 'success', {
            decisionsLink: true,
        });
    }, [
        decisionsStorageExecutionId,
        decisionRows,
        estimatedValueInput,
        hasPendingDeliveryItems,
        latestRow,
        linkedConversionItem?.id,
        onExpenseRecorded,
        onValuationFinancialized,
        reportSavedAt,
        showToast,
        valuedItemLabel,
    ]);

    const renderPanel = (row: Record<string, unknown> | null) => {
        if (!row?.id) return null;
        const decisionId = String(row.id || '').trim();
        const rejected = isExecutorRowRejectedAndFinal(row);
        const approved = isExecutorRowApprovedWorkflowActive(row, decisionRows);
        const pending =
            String(row.executorOutcome ?? 'pending') === 'pending' ||
            String(row.executorOutcome ?? '') === '';
        const appealSync = resolveExecutorRequestAppealSyncFromRow(row, decisionRows);

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
                title: 'قرار المنفذ على الانتداب',
                subtitle: rejected
                    ? 'تم رفض الطلب'
                    : approved
                      ? reportSavedAt
                          ? 'تمت الموافقة — التقرير مسجّل'
                          : 'تمت الموافقة — أكمل تقرير الخبراء'
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
                title: 'تقرير لجنة الخبراء',
                subtitle: reportSavedAt
                    ? expertCommitteeSizeLabelAr(requiredExperts)
                    : 'بعد موافقة المنفذ',
                status: reportSavedAt ? 'done' : 'active',
                tone: 'neutral',
                content: reportSavedAt ? null : (
                    <div className="space-y-2.5">
                        <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-right">
                            <p className="text-[9px] font-bold text-slate-500">الشيء المراد تقديره</p>
                            <p className="text-[11px] font-bold text-slate-100">{valuedItemLabel || '—'}</p>
                            <p className="mt-0.5 text-[9px] text-[#E6C673]/85">منقول</p>
                        </div>
                        <label className="block text-[9px] text-slate-400 text-right">
                            {expertCommitteeSizeLabelAr(requiredExperts)}
                        </label>
                        {requiredExperts <= 1 ? (
                            <input
                                type="text"
                                value={expertNames}
                                onChange={(e) => setExpertNames(e.target.value)}
                                placeholder="اسم الخبير"
                                dir="rtl"
                                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-white text-right focus:border-[#E6C673]/45 focus:outline-none"
                            />
                        ) : (
                            <div className="space-y-2">
                                {expertNameSlots.map((slot, idx) => (
                                    <input
                                        key={`expert_slot_${idx}`}
                                        type="text"
                                        value={slot}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setExpertNameSlots((prev) => {
                                                const next = [...prev];
                                                next[idx] = v;
                                                return next;
                                            });
                                        }}
                                        placeholder={`اسم الخبير ${idx + 1}`}
                                        dir="rtl"
                                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-white text-right focus:border-[#E6C673]/45 focus:outline-none"
                                    />
                                ))}
                            </div>
                        )}
                        <input
                            type="text"
                            inputMode="decimal"
                            value={estimatedValueInput}
                            onChange={(e) => setEstimatedValueInput(formatNumberInput(e.target.value))}
                            placeholder="القيمة المقدرة (د.ع)"
                            dir="ltr"
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-white text-right tabular-nums focus:border-[#E6C673]/45 focus:outline-none"
                        />
                        <p className="text-[9px] text-slate-500 text-right leading-relaxed">
                            تُحقَن في المركز المالي (إجمالي الدين) بعد اعتماد التقرير في الخطوة التالية.
                        </p>
                        <button
                            type="button"
                            onClick={saveExpertReport}
                            className="w-full rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-[11px] font-extrabold text-emerald-200 hover:bg-emerald-500/15"
                        >
                            حفظ تقرير الخبراء
                        </button>
                    </div>
                ),
            });

            if (reportSavedAt) {
                const laneBtnCls = (lane: typeof partyDecisionLane, tone: string) =>
                    `w-full rounded-xl border px-3 py-2 text-[11px] font-extrabold transition-all ${tone} ${
                        partyDecisionLane === lane
                            ? 'ring-2 ring-[#E6C673]/70 ring-offset-1 ring-offset-[#05060D]'
                            : ''
                    }`;

                steps.push({
                    id: `${decisionId}:parties`,
                    title: 'اعتماد التقرير أو الاعتراض',
                    subtitle: appealSync.enforced
                        ? 'انتهت دورة الطعن — اختر اعتماد أو اعتراض'
                        : 'يمكن اعتماد التقرير وتحويل القيمة للمركز المالي أو الاعتراض (1 → 3 → 5 خبراء)',
                    status: 'active',
                    tone: 'neutral',
                    content: (
                        <div className="space-y-2.5">
                            {partyDecisionLane === 'choose' ? (
                                <div className="space-y-2 rounded-2xl border border-white/10 bg-black/15 p-3">
                                    <p className="text-[9px] text-slate-400 text-right leading-relaxed">
                                        اختر مسار البت في التقرير
                                    </p>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        <button
                                            type="button"
                                            onClick={() => setPartyDecisionLane('approve')}
                                            className={laneBtnCls(
                                                'approve',
                                                'border-emerald-500/35 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15'
                                            )}
                                        >
                                            اعتماد التقرير وتحويل القيمة للمركز المالي
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPartyDecisionLane('objection')}
                                            className={laneBtnCls(
                                                'objection',
                                                'border-rose-400/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15'
                                            )}
                                        >
                                            اعتراض على التقرير
                                        </button>
                                    </div>
                                </div>
                            ) : partyDecisionLane === 'objection' ? (
                                <div className="space-y-2 rounded-2xl border border-amber-500/20 bg-amber-950/10 p-3">
                                    <p className="text-[9px] text-amber-300/90 text-right">
                                        مسار الاعتراض — تُزاد اللجنة (1 → 3 → 5) وتُعاد كتابة التقرير
                                    </p>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        <button
                                            type="button"
                                            onClick={() => submitExpertObjection('report')}
                                            className="w-full rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[11px] font-extrabold text-rose-100 hover:bg-rose-500/15"
                                        >
                                            اعتراض على التقرير (زيادة اللجنة)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => submitExpertObjection('experts')}
                                            className="w-full rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] font-extrabold text-amber-100 hover:bg-amber-500/15"
                                        >
                                            اعتراض على الخبراء (استبدال)
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setPartyDecisionLane('choose')}
                                        className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[10px] text-slate-400 hover:bg-black/30"
                                    >
                                        رجوع
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <button
                                        type="button"
                                        onClick={financializeAfterReportApproval}
                                        className="w-full rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-[11px] font-extrabold text-emerald-200 hover:bg-emerald-500/15"
                                    >
                                        تأكيد اعتماد التقرير وتحويل القيمة للمركز المالي
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPartyDecisionLane('choose')}
                                        className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[10px] text-slate-400 hover:bg-black/30"
                                    >
                                        رجوع
                                    </button>
                                </div>
                            )}
                        </div>
                    ),
                });
            }
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
            subtitle={
                executorApproved
                    ? 'تمت الموافقة — أكمل تقرير الخبراء بالأسفل'
                    : hasRequest
                      ? 'طلب قيد المتابعة — اضغط لعرض الخطوات'
                      : undefined
            }
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
                if (!valuedItemLabel) {
                    showToast('لا يوجد شيء منقول مرتبط بطلب التحويل المعتمد', 'warning');
                    return;
                }
                if (executorApproved && !resubmit) {
                    setExpanded(true);
                    setInlineActionGateKey(null);
                    showToast(
                        'تمت موافقة المنفذ — أكمل تقرير الخبراء والقيمة في الخطوات بالأسفل (لا حاجة لإرسال طلب جديد).',
                        'info',
                        { decisionsLink: true }
                    );
                    return;
                }
                const result = sendInitialSpecificDeliveryMovableValuationRequest({
                    executionId: decisionsStorageExecutionId,
                    itemDescription: valuedItemLabel,
                    supersedeCompletedHub: resubmit,
                });
                if (!result.ok) {
                    if (result.reason === 'executor_approved') {
                        setExpanded(true);
                        setInlineActionGateKey(null);
                        showToast(
                            'تمت موافقة المنفذ — أكمل تقرير الخبراء والقيمة في الخطوات بالأسفل.',
                            'info',
                            { decisionsLink: true }
                        );
                        return;
                    }
                    if (result.reason === 'pending') {
                        setExpanded(true);
                        setInlineActionGateKey(null);
                        showToast('يوجد طلب قيد البت لدى المنفذ — تابع الخطوات في البطاقة.', 'warning', {
                            decisionsLink: true,
                        });
                        return;
                    }
                    if (result.reason === 'complete') {
                        showToast(
                            'تم إكمال دورة التقدير سابقاً. اختر «تقديم طلب جديد» إن أردت إعادة الإرسال.',
                            'warning'
                        );
                        return;
                    }
                    showToast('تعذر إرسال الطلب — حاول مجدداً أو راجع مركز القرارات.', 'warning');
                    return;
                }
                setExpanded(true);
                showToast('تم إرسال الطلب إلى مركز قرارات المنفذ.', 'success', {
                    decisionsLink: true,
                });
            }}
            panelBody={renderPanel(latestRow)}
        />
    );
};
