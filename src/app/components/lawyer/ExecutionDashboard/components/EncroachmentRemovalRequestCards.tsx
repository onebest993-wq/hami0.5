import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Ruler, Truck, ChevronDown } from 'lucide-react';
import { InlineActionGate } from './InlineActionGate';
import type { InlineActionGateKey } from '../types';
import { useExecutorDecisions } from '@/app/components/lawyer/ExecutionDashboard/hooks/useExecutorDecisions';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import {
    getGoverningEncroachmentProcedureRowForMatch,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import {
    ENCROACHMENT_DEFAULT_SURVEYOR_ENTITY,
    ENCROACHMENT_INITIAL_MACHINERY_BODY,
    ENCROACHMENT_INITIAL_SURVEYOR_BODY,
    ENCROACHMENT_MACHINERY_REQUEST_TITLE,
    ENCROACHMENT_SURVEYOR_REQUEST_TITLE,
    finalizeEncroachmentRemovalRequestDetails,
    parseEncroachmentExpenseAmount,
    sendInitialEncroachmentRemovalRequest,
    type EncroachmentRemovalWorkflowKey,
    type EncroachmentCaseExpenseRow,
} from '@/app/utils/encroachmentRemovalRequests';
import { formatNumberInput } from '@/app/components/lawyer/ExecutionDashboard/utils/amountInput';

export type EncroachmentRemovalCardsVariant = 'full' | 'surveyor_only';

export interface EncroachmentRemovalRequestCardsProps {
    variant?: EncroachmentRemovalCardsVariant;
    decisionsStorageExecutionId: string;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info',
        opts?: { decisionsLink?: boolean }
    ) => void;
    onExpenseRecorded?: (row: EncroachmentCaseExpenseRow) => void;
}

const PROCEDURE_BUTTON_CLASS =
    'w-full text-right rounded-2xl px-4 py-3.5 transition-all border backdrop-blur-xl bg-[#0A1122]/70 border-white/5 hover:border-[#E6C673]/35';

function EncroachmentApprovedDetailsCollapsible(props: {
    title: string;
    row: Record<string, unknown>;
    open: boolean;
    onToggle: () => void;
    saved: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="mt-2 rounded-2xl border border-emerald-500/25 bg-emerald-950/15 overflow-hidden" dir="rtl">
            <button
                type="button"
                onClick={props.onToggle}
                className="w-full flex flex-row-reverse items-center justify-between gap-2 px-3 py-2.5 text-right hover:bg-white/[0.03] transition-colors"
            >
                <span className="text-[11px] font-bold text-emerald-200">{props.title}</span>
                <ChevronDown
                    size={14}
                    className={`shrink-0 text-slate-400 transition-transform ${props.open ? 'rotate-180' : ''}`}
                />
            </button>
            <AnimatePresence initial={false}>
                {props.open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-emerald-500/20 px-3 py-3 space-y-2.5">
                            {props.saved ? (
                                <p className="text-[11px] text-emerald-100/85 leading-relaxed whitespace-pre-wrap">
                                    {String(props.row.body || '').trim()}
                                </p>
                            ) : (
                                props.children
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export const EncroachmentRemovalRequestCards: React.FC<EncroachmentRemovalRequestCardsProps> = ({
    variant = 'full',
    decisionsStorageExecutionId,
    inlineActionGateKey,
    setInlineActionGateKey,
    showToast,
    onExpenseRecorded,
}) => {
    const { executionId, decisions } = useExecutorDecisions(decisionsStorageExecutionId);
    const decisionRows = React.useMemo(
        () => (Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : []),
        [decisions]
    );

    const triggerCoerciveAction = React.useCallback(
        (gateKey: InlineActionGateKey) => {
            setInlineActionGateKey(gateKey);
        },
        [setInlineActionGateKey]
    );

    const [detailsOpen, setDetailsOpen] = React.useState<Record<string, boolean>>({});
    const [surveyorEntity, setSurveyorEntity] = React.useState(ENCROACHMENT_DEFAULT_SURVEYOR_ENTITY);
    const [surveyorFees, setSurveyorFees] = React.useState('');
    const [machineryTypes, setMachineryTypes] = React.useState('');
    const [machineryFees, setMachineryFees] = React.useState('');

    const latestDecision = React.useCallback(
        (workflowKey: EncroachmentRemovalWorkflowKey): Record<string, unknown> | null => {
            const list = Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : [];
            return getGoverningEncroachmentProcedureRowForMatch(list, workflowKey);
        },
        [decisions]
    );

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

    const renderDecisionAccordion = React.useCallback(
        (label: string, row: Record<string, unknown> | null) => {
            if (!row?.id) return null;

            const decisionId = String(row.id || '').trim();
            const rejected = isExecutorRowRejectedAndFinal(row);
            const approved = isExecutorRowApprovedWorkflowActive(row, decisionRows);
            const pending =
                String(row.executorOutcome ?? 'pending') === 'pending' ||
                String(row.executorOutcome ?? '') === '';

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

            return (
                <div className="mt-2 rounded-2xl border border-white/10 bg-black/15 p-3" dir="rtl">
                    <ExecutionInlineAccordion steps={steps} />
                </div>
            );
        },
        [decisionRows, executionId, openAppeals]
    );

    const sendInitial = (workflowKey: EncroachmentRemovalWorkflowKey, title: string, body: string) => {
        const result = sendInitialEncroachmentRemovalRequest({
            executionId: decisionsStorageExecutionId,
            title,
            body,
            encroachmentWorkflowKey: workflowKey,
        });
        if (!result.ok) {
            showToast('تعذر إرسال الطلب', 'error');
            return;
        }
        showToast('تم إرسال الطلب إلى مركز القرارات.', 'success', { decisionsLink: true });
    };

    const saveSurveyorDetails = (decisionId: string) => {
        const entity = surveyorEntity.trim() || ENCROACHMENT_DEFAULT_SURVEYOR_ENTITY;
        const fees = parseEncroachmentExpenseAmount(surveyorFees);
        if (fees <= 0) {
            showToast('أدخل أجور الخبير بمبلغ صحيح', 'warning');
            return;
        }
        const body =
            `طلب انتداب مساح من التسجيل العقاري لتثبيت حدود التجاوز.\n` +
            `جهة الانتداب: ${entity}\n` +
            `أجور الخبير: ${fees.toLocaleString('ar-IQ')} د.ع.`;
        const result = finalizeEncroachmentRemovalRequestDetails({
            executionId: decisionsStorageExecutionId,
            decisionId,
            title: ENCROACHMENT_SURVEYOR_REQUEST_TITLE,
            body,
            encroachmentWorkflowKey: 'surveyor_appointment',
            expenseAmount: fees,
            expenseReason: `أجور خبير مساح — ${entity}`,
        });
        if (!result.ok || !result.expenseRow) {
            showToast('تعذر حفظ بيانات الطلب', 'error');
            return;
        }
        onExpenseRecorded?.(result.expenseRow);
        setSurveyorFees('');
        showToast('تم حفظ بيانات الطلب وتسجيل المصروف.', 'success');
    };

    const saveMachineryDetails = (decisionId: string) => {
        const types = machineryTypes.trim();
        if (!types) {
            showToast('أدخل نوع الآليات المطلوبة', 'warning');
            return;
        }
        const fees = parseEncroachmentExpenseAmount(machineryFees);
        if (fees <= 0) {
            showToast('أدخل أجور الآليات والعمال بمبلغ صحيح', 'warning');
            return;
        }
        const body =
            `طلب إذن إدخال آليات وعمال للإزالة على نفقة الدائن.\n` +
            `نوع الآليات المطلوبة: ${types}\n` +
            `أجور الآليات والعمال: ${fees.toLocaleString('ar-IQ')} د.ع.`;
        const result = finalizeEncroachmentRemovalRequestDetails({
            executionId: decisionsStorageExecutionId,
            decisionId,
            title: ENCROACHMENT_MACHINERY_REQUEST_TITLE,
            body,
            encroachmentWorkflowKey: 'machinery_entry_permit',
            expenseAmount: fees,
            expenseReason: `أجور آليات وعمال إزالة — ${types}`,
        });
        if (!result.ok || !result.expenseRow) {
            showToast('تعذر حفظ بيانات الطلب', 'error');
            return;
        }
        onExpenseRecorded?.(result.expenseRow);
        setMachineryFees('');
        showToast('تم حفظ بيانات الطلب وتسجيل المصروف.', 'success');
    };

    const surveyorRow = latestDecision('surveyor_appointment');
    const machineryRow = latestDecision('machinery_entry_permit');
    const surveyorSaved = Boolean(String(surveyorRow?.encroachmentRequestSavedAt || '').trim());
    const machinerySaved = Boolean(String(machineryRow?.encroachmentRequestSavedAt || '').trim());

    return (
        <>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => {
                        if (surveyorRow?.id) return;
                        triggerCoerciveAction('encroachment_surveyor_send');
                    }}
                    className={PROCEDURE_BUTTON_CLASS}
                >
                    <div className="flex flex-row-reverse items-center gap-3">
                        <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                            <Ruler className="w-6 h-6 text-white/70" />
                        </span>
                        <p className="text-white font-bold text-sm">{ENCROACHMENT_SURVEYOR_REQUEST_TITLE}</p>
                    </div>
                </button>

                {!surveyorRow?.id ? (
                    <InlineActionGate
                        gateKey="encroachment_surveyor_send"
                        activeKey={inlineActionGateKey}
                        onConfirm={() =>
                            sendInitial(
                                'surveyor_appointment',
                                ENCROACHMENT_SURVEYOR_REQUEST_TITLE,
                                ENCROACHMENT_INITIAL_SURVEYOR_BODY
                            )
                        }
                        onCancel={() => setInlineActionGateKey(null)}
                    />
                ) : null}

                {renderDecisionAccordion(ENCROACHMENT_SURVEYOR_REQUEST_TITLE, surveyorRow)}

                {surveyorRow?.id && isExecutorRowApprovedWorkflowActive(surveyorRow, decisionRows) && (
                    <EncroachmentApprovedDetailsCollapsible
                        title="بيانات انتداب الخبير — بعد موافقة المنفذ"
                        row={surveyorRow}
                        saved={surveyorSaved}
                        open={
                            String(surveyorRow.id) in detailsOpen
                                ? detailsOpen[String(surveyorRow.id)]
                                : true
                        }
                        onToggle={() =>
                            setDetailsOpen((prev) => ({
                                ...prev,
                                [String(surveyorRow.id)]: !prev[String(surveyorRow.id)],
                            }))
                        }
                    >
                        <div>
                            <label className="mb-1 block text-[10px] text-slate-400">جهة الانتداب</label>
                            <input
                                type="text"
                                value={surveyorEntity}
                                onChange={(e) => setSurveyorEntity(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-white focus:border-[#E6C673]/45 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-[10px] text-slate-400">أجور الخبير (د.ع)</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={surveyorFees}
                                onChange={(e) => setSurveyorFees(formatNumberInput(e.target.value))}
                                placeholder="0"
                                dir="ltr"
                                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-white text-right tabular-nums focus:border-[#E6C673]/45 focus:outline-none"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => saveSurveyorDetails(String(surveyorRow.id))}
                            className="w-full rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-[11px] font-extrabold text-emerald-200 hover:bg-emerald-500/15"
                        >
                            حفظ وتوليد الطلب
                        </button>
                    </EncroachmentApprovedDetailsCollapsible>
                )}
            </div>

            {variant === 'full' ? (
            <div className="relative">
                <button
                    type="button"
                    onClick={() => {
                        if (machineryRow?.id) return;
                        triggerCoerciveAction('encroachment_machinery_send');
                    }}
                    className={PROCEDURE_BUTTON_CLASS}
                >
                    <div className="flex flex-row-reverse items-center gap-3">
                        <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                            <Truck className="w-6 h-6 text-white/70" />
                        </span>
                        <p className="text-white font-bold text-sm">{ENCROACHMENT_MACHINERY_REQUEST_TITLE}</p>
                    </div>
                </button>

                {!machineryRow?.id ? (
                    <InlineActionGate
                        gateKey="encroachment_machinery_send"
                        activeKey={inlineActionGateKey}
                        onConfirm={() =>
                            sendInitial(
                                'machinery_entry_permit',
                                ENCROACHMENT_MACHINERY_REQUEST_TITLE,
                                ENCROACHMENT_INITIAL_MACHINERY_BODY
                            )
                        }
                        onCancel={() => setInlineActionGateKey(null)}
                    />
                ) : null}

                {renderDecisionAccordion(ENCROACHMENT_MACHINERY_REQUEST_TITLE, machineryRow)}

                {machineryRow?.id && isExecutorRowApprovedWorkflowActive(machineryRow, decisionRows) && (
                    <EncroachmentApprovedDetailsCollapsible
                        title="بيانات إذن الآليات — بعد موافقة المنفذ"
                        row={machineryRow}
                        saved={machinerySaved}
                        open={
                            String(machineryRow.id) in detailsOpen
                                ? detailsOpen[String(machineryRow.id)]
                                : true
                        }
                        onToggle={() =>
                            setDetailsOpen((prev) => ({
                                ...prev,
                                [String(machineryRow.id)]: !prev[String(machineryRow.id)],
                            }))
                        }
                    >
                        <div>
                            <label className="mb-1 block text-[10px] text-slate-400">نوع الآليات المطلوبة</label>
                            <input
                                type="text"
                                value={machineryTypes}
                                onChange={(e) => setMachineryTypes(e.target.value)}
                                placeholder="شفل، رافعة، عمال هدم"
                                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-white focus:border-[#E6C673]/45 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-[10px] text-slate-400">أجور الآليات والعمال (د.ع)</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={machineryFees}
                                onChange={(e) => setMachineryFees(formatNumberInput(e.target.value))}
                                placeholder="0"
                                dir="ltr"
                                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-white text-right tabular-nums focus:border-[#E6C673]/45 focus:outline-none"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => saveMachineryDetails(String(machineryRow.id))}
                            className="w-full rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-[11px] font-extrabold text-emerald-200 hover:bg-emerald-500/15"
                        >
                            حفظ وتوليد الطلب
                        </button>
                    </EncroachmentApprovedDetailsCollapsible>
                )}
            </div>
            ) : null}
        </>
    );
};
