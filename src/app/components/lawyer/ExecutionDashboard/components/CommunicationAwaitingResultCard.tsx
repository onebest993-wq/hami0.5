import React from 'react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { patchExecutorDecisionRow } from '@/app/utils/executorSeizureDecisionQueue';
import {
    buildCommunicationDisplayContext,
    buildNoResponseConfirmationDetails,
} from './communicationDecisionModel';
import { CommunicationContextPanel } from './CommunicationContextPanel';

export function CommunicationAwaitingResultCard({
    decision,
    decisionRows,
    exId,
    saving,
    setSaving,
    awaitingUiById,
    setAwaitingUiById,
    resultDraftById,
    setResultDraftById,
    showToast,
    pushTimelineEvent,
    nextTimelineId,
    saveCommunicationResult,
}: {
    decision: any;
    decisionRows: Record<string, unknown>[];
    exId: string;
    saving: boolean;
    setSaving: (v: boolean) => void;
    awaitingUiById: Record<
        string,
        { confirmingNoResponse?: boolean; responseFormOpen?: boolean; confirmLetterDate?: string }
    >;
    setAwaitingUiById: React.Dispatch<
        React.SetStateAction<
            Record<
                string,
                {
                    confirmingNoResponse?: boolean;
                    responseFormOpen?: boolean;
                    confirmLetterDate?: string;
                }
            >
        >
    >;
    resultDraftById: Record<string, { purpose: string; letterNum: string; letterDate: string; result: string }>;
    setResultDraftById: React.Dispatch<
        React.SetStateAction<
            Record<string, { purpose: string; letterNum: string; letterDate: string; result: string }>
        >
    >;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    pushTimelineEvent: (event: any) => void;
    nextTimelineId: () => string;
    saveCommunicationResult: (
        decisionId: string,
        directorate: string,
        draft: { purpose: string; letterNum: string; letterDate: string; result: string },
    ) => void;
}) {
    const decisionId = String(decision?.id || '').trim();
    const ctx = buildCommunicationDisplayContext(decision, decisionRows);
    const ui = awaitingUiById[decisionId] || {};
    const draft =
        resultDraftById[decisionId] || {
            purpose: ctx.directorate,
            letterNum: '',
            letterDate: '',
            result: '',
        };
    const showActionButtons = !ui.confirmingNoResponse;
    const confirmLetterDate = String(ui.confirmLetterDate || getLocalTodayYmd()).trim();

    const dismissFollowup = () => {
        if (!exId || !decisionId || saving) return;
        setSaving(true);
        try {
            patchExecutorDecisionRow(exId, decisionId, {
                deputationFollowupDismissed: true,
                deputationClosed: true,
                deputationResultDetails: 'تم تجاهل متابعة نتيجة المخاطبة.',
            } as any);
            setAwaitingUiById((prev) => {
                const next = { ...prev };
                delete next[decisionId];
                return next;
            });
            showToast('تم تجاهل متابعة النتيجة', 'info');
        } catch {
            showToast('تعذّر التجاهل', 'error');
        }
        setSaving(false);
    };

    const confirmNoResponse = () => {
        if (!exId || !decisionId || saving) return;
        if (!confirmLetterDate || !/^\d{4}-\d{2}-\d{2}$/.test(confirmLetterDate)) {
            showToast('يرجى إدخال تاريخ كتاب التأكيد', 'warning');
            return;
        }
        setSaving(true);
        try {
            const details = buildNoResponseConfirmationDetails({
                previousLetterDate: ctx.requestDate,
                confirmationDate: confirmLetterDate,
            });
            patchExecutorDecisionRow(exId, decisionId, {
                deputationNoResponseConfirmed: true,
                deputationClosed: true,
                deputationResultDetails: details,
                deputationReferralDate: confirmLetterDate,
            } as any);
            const now = new Date().toISOString();
            pushTimelineEvent({
                id: nextTimelineId(),
                type: 'communication',
                title: `تأكيد — عدم ورود إجابة — ${ctx.directorate}`,
                description: details,
                date: confirmLetterDate,
                timestamp: now,
                source: 'محضر المتابعة',
                metadata: { timelineThreadKey: `executor_decision:${decisionId}` },
            });
            setAwaitingUiById((prev) => {
                const next = { ...prev };
                delete next[decisionId];
                return next;
            });
            showToast('تم تسجيل عدم ورود الإجابة', 'success');
        } catch {
            showToast('تعذّر التسجيل', 'error');
        }
        setSaving(false);
    };

    return (
        <div
            key={decisionId}
            className="rounded-2xl border border-white/10 bg-black/15 px-3 py-3 text-right space-y-3"
        >
            <div className="space-y-1">
                <p className="text-[12px] font-black text-slate-50">{ctx.directorate}</p>
                <p className="text-[10px] text-slate-500">مخاطبة بانتظار النتيجة</p>
            </div>

            {<CommunicationContextPanel ctx={ctx} compact />}

            {ui.confirmingNoResponse ? (
                <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 px-3 py-2.5 space-y-2">
                    <p className="text-[11px] font-bold text-amber-100">
                        تأكيد عدم ورود إجابة من «{ctx.directorate}»؟
                    </p>
                    <p className="text-[10px] leading-relaxed text-amber-100/80">
                        {ctx.requestDate
                            ? `سيُسجَّل تأكيد على الكتاب السابق المؤرّخ في ${ctx.requestDate} كمخاطبة مستقلة.`
                            : 'سيُسجَّل تأكيد على الكتاب السابق كمخاطبة مستقلة.'}
                    </p>
                    <div>
                        <label className="mb-1 block text-[9px] text-amber-200/70">
                            تاريخ كتاب التأكيد *
                        </label>
                        <input
                            type="date"
                            value={confirmLetterDate}
                            max={getLocalTodayYmd()}
                            onChange={(e) =>
                                setAwaitingUiById((prev) => ({
                                    ...prev,
                                    [decisionId]: {
                                        ...prev[decisionId],
                                        confirmingNoResponse: true,
                                        confirmLetterDate: e.target.value,
                                    },
                                }))
                            }
                            dir="rtl"
                            className="w-full rounded-xl border border-amber-500/25 bg-black/30 px-3 py-2 text-[11px] text-amber-50 focus:outline-none focus:border-amber-500/50 [&::-webkit-calendar-picker-indicator]:invert"
                        />
                    </div>
                    <div className="flex flex-row-reverse flex-wrap gap-2">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={confirmNoResponse}
                            className="rounded-xl border border-amber-500/40 bg-amber-600/20 px-3 py-2 text-[11px] font-black text-amber-100 disabled:opacity-40"
                        >
                            تأكيد
                        </button>
                        <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                                setAwaitingUiById((prev) => ({
                                    ...prev,
                                    [decisionId]: {
                                        ...prev[decisionId],
                                        confirmingNoResponse: false,
                                    },
                                }))
                            }
                            className="rounded-xl bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-100 disabled:opacity-40"
                        >
                            إلغاء
                        </button>
                    </div>
                </div>
            ) : showActionButtons ? (
                <div className="flex flex-row-reverse flex-wrap gap-2">
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                            setAwaitingUiById((prev) => ({
                                ...prev,
                                [decisionId]: {
                                    ...prev[decisionId],
                                    confirmingNoResponse: true,
                                    responseFormOpen: false,
                                    confirmLetterDate:
                                        prev[decisionId]?.confirmLetterDate || getLocalTodayYmd(),
                                },
                            }))
                        }
                        className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[10px] font-bold text-amber-100 hover:bg-amber-500/15 disabled:opacity-40"
                    >
                        عدم ورود الإجابة
                    </button>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                            setAwaitingUiById((prev) => ({
                                ...prev,
                                [decisionId]: {
                                    ...prev[decisionId],
                                    responseFormOpen: !prev[decisionId]?.responseFormOpen,
                                    confirmingNoResponse: false,
                                },
                            }))
                        }
                        className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-[10px] font-bold text-emerald-100 hover:bg-emerald-500/15 disabled:opacity-40"
                    >
                        تم ورود الإجابة
                    </button>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={dismissFollowup}
                        className="rounded-xl border border-slate-500/35 bg-slate-800/60 px-3 py-2 text-[10px] font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                    >
                        التجاهل
                    </button>
                </div>
            ) : null}

            {ui.responseFormOpen && showActionButtons ? (
                <div className="space-y-2 border-t border-white/10 pt-2">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="mb-1 block text-[9px] text-slate-500">تاريخ الإجابة</label>
                            <input
                                type="date"
                                value={draft.letterDate}
                                onChange={(e) =>
                                    setResultDraftById((prev) => ({
                                        ...prev,
                                        [decisionId]: { ...draft, letterDate: e.target.value },
                                    }))
                                }
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-[9px] text-slate-500">رقم الكتاب</label>
                            <input
                                type="text"
                                value={draft.letterNum}
                                onChange={(e) =>
                                    setResultDraftById((prev) => ({
                                        ...prev,
                                        [decisionId]: { ...draft, letterNum: e.target.value },
                                    }))
                                }
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100 text-right"
                                placeholder="رقم الكتاب"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-[9px] text-slate-500">مضمون الإجابة</label>
                        <textarea
                            value={draft.result}
                            onChange={(e) =>
                                setResultDraftById((prev) => ({
                                    ...prev,
                                    [decisionId]: { ...draft, result: e.target.value },
                                }))
                            }
                            rows={3}
                            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100 text-right"
                            placeholder="مضمون الإجابة الواردة"
                        />
                    </div>
                    <button
                        type="button"
                        disabled={saving || !String(draft.result || '').trim()}
                        onClick={() => saveCommunicationResult(decisionId, ctx.directorate, draft)}
                        className="w-full rounded-xl bg-emerald-700/70 py-2.5 text-[11px] font-black text-white disabled:opacity-40"
                    >
                        حفظ
                    </button>
                </div>
            ) : null}
        </div>
    );
}
