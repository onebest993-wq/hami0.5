import React from 'react';
import { DatePickerField } from '../../components/DatePickerField';
import type { JudgeDecisionLifecyclePanelProps } from '../JudgeDecisionLifecyclePanelProps';
import { URGENT_DOSSIER_BTN_PRIMARY, URGENT_DOSSIER_INPUT } from '../../layout/urgentDossierUi';

type DecisionValue = 'accepted' | 'partially_accepted' | 'rejected';

const DECISION_OPTIONS: Array<{ value: DecisionValue; label: string; active: string }> = [
    {
        value: 'accepted',
        label: 'إجابة',
        active: 'border-emerald-500/45 bg-emerald-500/15 text-emerald-100',
    },
    {
        value: 'partially_accepted',
        label: 'جزئية',
        active: 'border-cyan-500/45 bg-cyan-500/15 text-cyan-100',
    },
    {
        value: 'rejected',
        label: 'رفض',
        active: 'border-rose-500/45 bg-rose-500/15 text-rose-100',
    },
];

export function JudgeDecisionFormPanel(props: JudgeDecisionLifecyclePanelProps) {
    const {
        clearJudgeDecision,
        guaranteeDetails,
        guaranteeSubmitted,
        handleJudgeDecisionSubmit,
        isFinalized,
        isIqrarContext,
        judgeDecision,
        judgeDecisionDateChronologyError,
        phase1JudgeDecisionMinYmd,
        setGuaranteeDetails,
        setGuaranteeSubmitted,
        setJudgeDecision,
        showJudgeDecisionBlock,
        showJudgeDecisionFullForm,
        showJudgeDecisionTerminateOnly,
    } = props;

    if (!showJudgeDecisionBlock) return null;

    if (showJudgeDecisionTerminateOnly) {
        return (
            <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2.5 space-y-2">
                <p className="text-rose-100 text-xs font-bold leading-relaxed">
                    تم تسجيل جلسة إبطال الطلب. يمكن إغلاق الإضبارة دون إدخال إجابة أو رفض.
                </p>
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleJudgeDecisionSubmit(e);
                        }}
                        disabled={isFinalized}
                        className="min-h-[40px] px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                    >
                        حفظ وإغلاق الإضبارة
                    </button>
                </div>
            </div>
        );
    }

    if (!showJudgeDecisionFullForm) return null;

    const dateLabel = isIqrarContext ? 'تاريخ المصادقة' : 'تاريخ القرار';

    return (
        <div className="space-y-3">
            {isIqrarContext ? (
                <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] cursor-pointer touch-manipulation">
                    <input
                        type="checkbox"
                        checked={judgeDecision.decision === 'accepted'}
                        onChange={(e) =>
                            setJudgeDecision((prev) => ({
                                ...prev,
                                decision: e.target.checked ? 'accepted' : null,
                                requiresGuarantee: false,
                            }))
                        }
                        disabled={isFinalized}
                        className="accent-emerald-500 w-4 h-4 shrink-0"
                    />
                    <span className="text-sm font-bold text-white">تم إصدار حجة الإقرار والمصادقة عليها</span>
                </label>
            ) : (
                <div className="grid grid-cols-3 gap-2">
                    {DECISION_OPTIONS.map((opt) => {
                        const selected = judgeDecision.decision === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                disabled={isFinalized}
                                onClick={() =>
                                    setJudgeDecision((prev) => ({
                                        ...prev,
                                        decision: opt.value,
                                        requiresGuarantee:
                                            opt.value === 'rejected' ? false : prev.requiresGuarantee,
                                    }))
                                }
                                className={`min-h-[44px] px-2 py-2 rounded-lg border text-xs font-extrabold transition-all touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed ${
                                    selected
                                        ? opt.active
                                        : 'border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06] hover:text-white/80'
                                }`}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                <div className="flex-1 min-w-0">
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wide mb-1">
                        {dateLabel} <span className="text-red-400">*</span>
                    </label>
                    <DatePickerField
                        value={judgeDecision.decisionDate || ''}
                        onValueChange={(v) => setJudgeDecision((prev) => ({ ...prev, decisionDate: v }))}
                        min={phase1JudgeDecisionMinYmd || undefined}
                        disabled={isFinalized || !judgeDecision.decision}
                        inputClassName={`${URGENT_DOSSIER_INPUT} py-2`}
                    />
                    {!!judgeDecisionDateChronologyError && (
                        <div className="mt-1 text-red-200 text-[11px] font-bold">
                            {judgeDecisionDateChronologyError}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void clearJudgeDecision(e);
                        }}
                        className="min-h-[40px] px-3 py-2 text-white/50 hover:text-white text-xs font-bold transition-colors touch-manipulation"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleJudgeDecisionSubmit(e);
                        }}
                        disabled={isFinalized || !!judgeDecisionDateChronologyError}
                        className={`${URGENT_DOSSIER_BTN_PRIMARY} min-h-[40px] py-2 text-xs`}
                    >
                        حفظ القرار
                    </button>
                </div>
            </div>

            {!isIqrarContext &&
                (judgeDecision.decision === 'accepted' || judgeDecision.decision === 'partially_accepted') && (
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 space-y-2">
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                disabled={isFinalized}
                                onClick={() => setJudgeDecision((prev) => ({ ...prev, requiresGuarantee: true }))}
                                className={`min-h-[36px] px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-colors touch-manipulation ${
                                    judgeDecision.requiresGuarantee
                                        ? 'border-amber-500/40 bg-amber-500/15 text-amber-100'
                                        : 'border-white/10 text-white/50 hover:bg-white/[0.04]'
                                }`}
                            >
                                كفالة مطلوبة
                            </button>
                            <button
                                type="button"
                                disabled={isFinalized}
                                onClick={() => {
                                    setJudgeDecision((prev) => ({ ...prev, requiresGuarantee: false }));
                                    setGuaranteeSubmitted(false);
                                }}
                                className={`min-h-[36px] px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-colors touch-manipulation ${
                                    !judgeDecision.requiresGuarantee
                                        ? 'border-white/25 bg-white/[0.06] text-white/90'
                                        : 'border-white/10 text-white/50 hover:bg-white/[0.04]'
                                }`}
                            >
                                بدون كفالة
                            </button>
                        </div>
                        {judgeDecision.requiresGuarantee && (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <input
                                    type="text"
                                    value={guaranteeDetails.amount}
                                    onChange={(e) => {
                                        const amount = e.target.value;
                                        setGuaranteeDetails((prev) => ({ ...prev, amount }));
                                        if (!String(amount || '').trim()) setGuaranteeSubmitted(false);
                                    }}
                                    disabled={isFinalized}
                                    placeholder="مبلغ الكفالة"
                                    className={`flex-1 ${URGENT_DOSSIER_INPUT} py-2 text-sm`}
                                />
                                <label
                                    className={`inline-flex items-center gap-2 text-xs font-bold shrink-0 ${
                                        String(guaranteeDetails.amount || '').trim()
                                            ? 'text-white cursor-pointer'
                                            : 'text-white/40 cursor-not-allowed'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={guaranteeSubmitted}
                                        onChange={(e) => {
                                            if (!String(guaranteeDetails.amount || '').trim()) return;
                                            setGuaranteeSubmitted(e.target.checked);
                                        }}
                                        disabled={
                                            isFinalized || !String(guaranteeDetails.amount || '').trim()
                                        }
                                        className="accent-emerald-500 disabled:opacity-40"
                                    />
                                    تم الإيداع
                                </label>
                            </div>
                        )}
                    </div>
                )}
        </div>
    );
}
