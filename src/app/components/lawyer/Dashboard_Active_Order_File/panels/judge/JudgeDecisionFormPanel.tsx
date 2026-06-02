import React from 'react';
import { motion } from 'motion/react';
import { FileCheck } from 'lucide-react';
import { DatePickerField } from '../../components/DatePickerField';
import type { JudgeDecisionLifecyclePanelProps } from '../JudgeDecisionLifecyclePanelProps';

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

    return (
                                                <motion.div className="decision-block border border-white/10 bg-white/5 rounded-xl p-4">
                                                    <div className="text-white font-extrabold text-sm flex items-center gap-2">
                                                        <FileCheck size={16} className="text-cyan-200" />
                                                        قرار القاضي
                                                    </div>

                                                    {showJudgeDecisionTerminateOnly ? (
                                                        <div className="mt-4 space-y-4">
                                                            <div className="border border-rose-500/25 bg-rose-500/10 rounded-lg px-3 py-2 text-rose-100 text-xs font-bold">
                                                                🛑 تم تسجيل جلسة إبطال الطلب. يمكنك إغلاق الإضبارة من الزر أدناه دون إدخال إجابة/رفض.
                                                            </div>
                                                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        void handleJudgeDecisionSubmit(e);
                                                                    }}
                                                                    disabled={isFinalized}
                                                                    className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    🔒 حفظ وإغلاق الإضبارة
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : showJudgeDecisionFullForm ? (
                                                        <div className="mt-4 space-y-4">
                                                            <div className="space-y-3">
                                                                {isIqrarContext ? (
                                                                    <label className="flex items-center gap-3 p-4 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 rounded-lg cursor-pointer transition-all">
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
                                                                            className="accent-emerald-500"
                                                                        />
                                                                        <div className="flex-1">
                                                                            <p className="text-white font-bold">
                                                                                تم إصدار حجة الإقرار والمصادقة عليها
                                                                            </p>
                                                                        </div>
                                                                    </label>
                                                                ) : (
                                                                    <>
                                                                <label className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all">
                                                                    <input
                                                                        type="radio"
                                                                        name="judgeDecision"
                                                                        value="accepted"
                                                                        checked={judgeDecision.decision === 'accepted'}
                                                                        onChange={() =>
                                                                            setJudgeDecision((prev) => ({
                                                                                ...prev,
                                                                                decision: 'accepted',
                                                                            }))
                                                                        }
                                                                        disabled={isFinalized}
                                                                        className="accent-emerald-500"
                                                                    />
                                                                    <div className="flex-1">
                                                                        <p className="text-white font-bold">إجابة الطلب</p>
                                                                    </div>
                                                                </label>
                                                                <label className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all">
                                                                    <input
                                                                        type="radio"
                                                                        name="judgeDecision"
                                                                        value="partially_accepted"
                                                                        checked={judgeDecision.decision === 'partially_accepted'}
                                                                        onChange={() =>
                                                                            setJudgeDecision((prev) => ({
                                                                                ...prev,
                                                                                decision: 'partially_accepted',
                                                                            }))
                                                                        }
                                                                        disabled={isFinalized}
                                                                        className="accent-cyan-500"
                                                                    />
                                                                    <div className="flex-1">
                                                                        <p className="text-white font-bold">إجابة جزئية</p>
                                                                    </div>
                                                                </label>
                                                                <label className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all">
                                                                    <input
                                                                        type="radio"
                                                                        name="judgeDecision"
                                                                        value="rejected"
                                                                        checked={judgeDecision.decision === 'rejected'}
                                                                        onChange={() =>
                                                                            setJudgeDecision((prev) => ({
                                                                                ...prev,
                                                                                decision: 'rejected',
                                                                                requiresGuarantee: false,
                                                                            }))
                                                                        }
                                                                        disabled={isFinalized}
                                                                        className="accent-rose-500"
                                                                    />
                                                                    <div className="flex-1">
                                                                        <p className="text-white font-bold">رفض الطلب</p>
                                                                    </div>
                                                                </label>
                                                                    </>
                                                                )}
                                                            </div>

                                                            <div>
                                                                <label className="block text-white/70 text-sm mb-2">
                                                                    {isIqrarContext ? (
                                                                        <>
                                                                            تاريخ المصادقة على الحجة{' '}
                                                                            <span className="text-red-400">*</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            تاريخ قرار القاضي{' '}
                                                                            <span className="text-red-400">*</span>
                                                                        </>
                                                                    )}
                                                                </label>
                                                                <DatePickerField
                                                                    value={judgeDecision.decisionDate || ''}
                                                                    onValueChange={(v) => setJudgeDecision((prev) => ({ ...prev, decisionDate: v }))}
                                                                    min={phase1JudgeDecisionMinYmd || undefined}
                                                                    disabled={isFinalized || !judgeDecision.decision}
                                                                    inputClassName="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500/40 focus:outline-none"
                                                                />
                                                                {!!judgeDecisionDateChronologyError && (
                                                                    <div className="mt-1 text-red-200 text-xs font-bold">{judgeDecisionDateChronologyError}</div>
                                                                )}
                                                            </div>

                                                            {!isIqrarContext &&
                                                            (judgeDecision.decision === 'accepted' || judgeDecision.decision === 'partially_accepted') && (
                                                                <div className="space-y-3 border border-white/10 bg-black/20 rounded-xl p-4">
                                                                    <div className="text-white font-bold text-sm">الكفالة الضامنة</div>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                        <label className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer">
                                                                            <input
                                                                                type="radio"
                                                                                name="judgeGuarantee"
                                                                                checked={judgeDecision.requiresGuarantee}
                                                                                onChange={() => setJudgeDecision((prev) => ({ ...prev, requiresGuarantee: true }))}
                                                                                disabled={isFinalized}
                                                                                className="accent-amber-500"
                                                                            />
                                                                            <span className="text-white text-sm font-bold">الكفالة مطلوبة</span>
                                                                        </label>
                                                                        <label className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer">
                                                                            <input
                                                                                type="radio"
                                                                                name="judgeGuarantee"
                                                                                checked={!judgeDecision.requiresGuarantee}
                                                                                onChange={() => {
                                                                                    setJudgeDecision((prev) => ({ ...prev, requiresGuarantee: false }));
                                                                                    setGuaranteeSubmitted(false);
                                                                                }}
                                                                                disabled={isFinalized}
                                                                                className="accent-slate-400"
                                                                            />
                                                                            <span className="text-white text-sm font-bold">لا توجد كفالة</span>
                                                                        </label>
                                                                    </div>
                                                                    {judgeDecision.requiresGuarantee && (
                                                                        <div className="space-y-3">
                                                                            <div>
                                                                                <label className="block text-white/70 text-sm mb-2">
                                                                                    مبلغ الكفالة <span className="text-red-400">*</span>
                                                                                </label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={guaranteeDetails.amount}
                                                                                    onChange={(e) => {
                                                                                        const amount = e.target.value;
                                                                                        setGuaranteeDetails((prev) => ({ ...prev, amount }));
                                                                                        if (!String(amount || '').trim()) setGuaranteeSubmitted(false);
                                                                                    }}
                                                                                    disabled={isFinalized}
                                                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-amber-500/40 focus:outline-none"
                                                                                />
                                                                            </div>
                                                                            <label
                                                                                className={`flex items-center gap-2 text-sm font-bold ${
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
                                                                                    disabled={isFinalized || !String(guaranteeDetails.amount || '').trim()}
                                                                                    className="accent-emerald-500 disabled:opacity-40"
                                                                                />
                                                                                تم إيداع الكفالة
                                                                            </label>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        void clearJudgeDecision(e);
                                                                    }}
                                                                    className="px-3 py-2 text-white/60 hover:text-white transition-colors font-bold"
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
                                                                    className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    🔒 حفظ قرار القاضي
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </motion.div>
    );
}
