import React from 'react';
import { Truck } from '@/app/components/ui/icons/Truck';
import { InlineActionGate } from '../InlineActionGate';
import type { InlineActionGateKey } from '../../types';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import {
    ENCROACHMENT_INITIAL_MACHINERY_BODY,
    ENCROACHMENT_MACHINERY_REQUEST_TITLE,
    finalizeEncroachmentRemovalRequestDetails,
    parseEncroachmentExpenseAmount,
    sendInitialEncroachmentRemovalRequest,
    type EncroachmentCaseExpenseRow,
} from '@/app/utils/encroachmentRemovalRequests';
import { formatNumberInput } from '@/app/utils/execution/amountInput';
import { EncroachmentApprovedDetailsCollapsible } from '../EncroachmentApprovedDetailsCollapsible';
import { PROCEDURE_BUTTON_CLASS } from '../EncroachmentRemovalRequestCards.types';
import {
    EncroachmentDecisionInlineAccordion,
    encroachmentWorkflowFlags,
} from './encroachmentDecisionHelpers';

export function EncroachmentMachineryRequestCard({
    decisionsStorageExecutionId,
    executionId,
    decisionRows,
    machineryRow,
    inlineActionGateKey,
    setInlineActionGateKey,
    showToast,
    onExpenseRecorded,
    onOpenAppeals,
    detailsOpen,
    setDetailsOpen,
}: {
    decisionsStorageExecutionId: string;
    executionId: string;
    decisionRows: Record<string, unknown>[];
    machineryRow: Record<string, unknown> | null;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info',
        opts?: { decisionsLink?: boolean }
    ) => void;
    onExpenseRecorded?: (row: EncroachmentCaseExpenseRow) => void;
    onOpenAppeals: (decisionId: string) => void;
    detailsOpen: Record<string, boolean>;
    setDetailsOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
    const [machineryTypes, setMachineryTypes] = React.useState('');
    const [machineryFees, setMachineryFees] = React.useState('');
    const { saved: machinerySaved, workflowComplete, inProgress } =
        encroachmentWorkflowFlags(machineryRow);

    const sendInitial = (supersedeCompletedHub?: boolean) => {
        const result = sendInitialEncroachmentRemovalRequest({
            executionId: decisionsStorageExecutionId,
            title: ENCROACHMENT_MACHINERY_REQUEST_TITLE,
            body: ENCROACHMENT_INITIAL_MACHINERY_BODY,
            encroachmentWorkflowKey: 'machinery_entry_permit',
            supersedeCompletedHub,
        });
        if (!result.ok) {
            showToast('تعذر إرسال الطلب', 'error');
            return;
        }
        showToast('تم إرسال الطلب إلى مركز القرارات.', 'success', { decisionsLink: true });
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
        setDetailsOpen((prev) => ({ ...prev, [decisionId]: false }));
        showToast('تم حفظ بيانات الطلب وتسجيل المصروف.', 'success');
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => {
                    if (inProgress) return;
                    setInlineActionGateKey('encroachment_machinery_send');
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

            {!machineryRow?.id || workflowComplete ? (
                <InlineActionGate
                    gateKey="encroachment_machinery_send"
                    activeKey={inlineActionGateKey}
                    onConfirm={() => sendInitial(workflowComplete)}
                    onCancel={() => setInlineActionGateKey(null)}
                />
            ) : null}

            {inProgress ? (
                <EncroachmentDecisionInlineAccordion
                    label={ENCROACHMENT_MACHINERY_REQUEST_TITLE}
                    row={machineryRow}
                    decisionRows={decisionRows}
                    executionId={executionId}
                    onOpenAppeals={onOpenAppeals}
                />
            ) : null}

            {workflowComplete ? (
                <div className="mt-2 rounded-2xl border border-emerald-500/25 bg-emerald-950/20 px-3 py-2.5 text-right">
                    <p className="text-[11px] font-black text-emerald-100">تم إكمال طلب إذن الآليات</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-emerald-200/85">
                        لإرسال طلب جديد اضغط الزر أعلاه.
                    </p>
                </div>
            ) : null}

            {inProgress &&
            machineryRow?.id &&
            isExecutorRowApprovedWorkflowActive(machineryRow, decisionRows) ? (
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
                        <label className="mb-1 block text-[10px] text-slate-400">
                            أجور الآليات والعمال (د.ع)
                        </label>
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
            ) : null}
        </div>
    );
}
