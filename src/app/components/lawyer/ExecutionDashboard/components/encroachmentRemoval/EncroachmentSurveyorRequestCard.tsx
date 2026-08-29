import React from 'react';
import { Ruler } from '@/app/components/ui/icons/Ruler';
import { InlineActionGate } from '../InlineActionGate';
import type { InlineActionGateKey } from '../../types';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import {
    ENCROACHMENT_DEFAULT_SURVEYOR_ENTITY,
    ENCROACHMENT_INITIAL_SURVEYOR_BODY,
    ENCROACHMENT_SURVEYOR_REQUEST_TITLE,
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

export function EncroachmentSurveyorRequestCard({
    decisionsStorageExecutionId,
    executionId,
    decisionRows,
    surveyorRow,
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
    surveyorRow: Record<string, unknown> | null;
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
    const [surveyorEntity, setSurveyorEntity] = React.useState(ENCROACHMENT_DEFAULT_SURVEYOR_ENTITY);
    const [surveyorFees, setSurveyorFees] = React.useState('');
    const { saved: surveyorSaved, workflowComplete, inProgress } =
        encroachmentWorkflowFlags(surveyorRow);

    const sendInitial = (supersedeCompletedHub?: boolean) => {
        const result = sendInitialEncroachmentRemovalRequest({
            executionId: decisionsStorageExecutionId,
            title: ENCROACHMENT_SURVEYOR_REQUEST_TITLE,
            body: ENCROACHMENT_INITIAL_SURVEYOR_BODY,
            encroachmentWorkflowKey: 'surveyor_appointment',
            supersedeCompletedHub,
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
        setDetailsOpen((prev) => ({ ...prev, [decisionId]: false }));
        showToast('تم حفظ بيانات الطلب وتسجيل المصروف.', 'success');
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => {
                    if (inProgress) return;
                    setInlineActionGateKey('encroachment_surveyor_send');
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

            {!surveyorRow?.id || workflowComplete ? (
                <InlineActionGate
                    gateKey="encroachment_surveyor_send"
                    activeKey={inlineActionGateKey}
                    onConfirm={() => sendInitial(workflowComplete)}
                    onCancel={() => setInlineActionGateKey(null)}
                />
            ) : null}

            {inProgress ? (
                <EncroachmentDecisionInlineAccordion
                    label={ENCROACHMENT_SURVEYOR_REQUEST_TITLE}
                    row={surveyorRow}
                    decisionRows={decisionRows}
                    executionId={executionId}
                    onOpenAppeals={onOpenAppeals}
                />
            ) : null}

            {workflowComplete ? (
                <div className="mt-2 rounded-2xl border border-emerald-500/25 bg-emerald-950/20 px-3 py-2.5 text-right">
                    <p className="text-[11px] font-black text-emerald-100">تم إكمال طلب انتداب الخبير</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-emerald-200/85">
                        لإرسال طلب جديد اضغط الزر أعلاه.
                    </p>
                </div>
            ) : null}

            {inProgress &&
            surveyorRow?.id &&
            isExecutorRowApprovedWorkflowActive(surveyorRow, decisionRows) ? (
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
            ) : null}
        </div>
    );
}
