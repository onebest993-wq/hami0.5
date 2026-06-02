import React from 'react';
import { FileCheck, ChevronDown } from 'lucide-react';
import { formatDateText } from '../../utils/formatters';
import type { JudgeDecisionLifecyclePanelProps } from '../JudgeDecisionLifecyclePanelProps';

export function JudgeDecisionPhaseHeader(props: JudgeDecisionLifecyclePanelProps) {
    const {
        activeLifecycleStep,
        effectiveJudgeDecision,
        effectiveJudgeDecisionDate,
        fileStatus,
        guaranteeSubmitted,
        isFinalityTerminatedRequest,
        isIqrarContext,
        judgeDecision,
        toggleLifecycleStep,
    } = props;

    return (
                                <button
                                    type="button"
                                    onClick={() => toggleLifecycleStep('judge')}
                                    className={`w-full px-4 py-4 flex items-center justify-between gap-3 text-right ${
                                        fileStatus === 'pending' ? 'bg-gradient-to-r from-blue-900/30 to-cyan-900/20 hover:from-blue-900/40 hover:to-cyan-900/30' : 'bg-gradient-to-r from-slate-900/50 to-slate-900/30'
                                    } group`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-9 h-9 rounded-full flex items-center justify-center border ${
                                                fileStatus === 'pending'
                                                    ? 'border-blue-500/40 bg-blue-500/10'
                                                    : judgeDecision.decision === 'accepted' || judgeDecision.decision === 'partially_accepted'
                                                      ? 'border-green-500/40 bg-green-500/10'
                                                      : 'border-red-500/40 bg-red-500/10'
                                            }`}
                                        >
                                            <span className="text-sm font-extrabold text-white">1</span>
                                        </div>
                                        <div>
                                            <div className="text-white font-extrabold text-sm flex items-center gap-2">
                                                <FileCheck size={18} className="text-blue-300" />
                                                قرار القاضي
                                            </div>
                                            <div className="text-white/50 text-xs mt-0.5">
                                                {isFinalityTerminatedRequest
                                                    ? '🚫 دعوى مبطلة/متروكة'
                                                    : fileStatus === 'pending'
                                                    ? 'الخطوة الوحيدة النشطة حالياً'
                                                    : isIqrarContext && judgeDecision.decision === 'accepted'
                                                      ? `مكتملة: تم إصدار حجة الإقرار — ${formatDateText(judgeDecision.decisionDate) || '—'}`
                                                      : judgeDecision.decision === 'accepted'
                                                        ? `مكتملة: إجابة الطلب — ${formatDateText(judgeDecision.decisionDate) || '—'}`
                                                        : judgeDecision.decision === 'partially_accepted'
                                                          ? `مكتملة: إجابة جزئية — ${formatDateText(judgeDecision.decisionDate) || '—'}`
                                                          : `مكتملة: رفض الطلب — ${formatDateText(judgeDecision.decisionDate) || '—'}`}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-white/60 text-xs">
                                        {isFinalityTerminatedRequest
                                            ? '🚫'
                                            : fileStatus === 'pending'
                                            ? 'مفتوحة'
                                            : judgeDecision.decision === 'accepted' || judgeDecision.decision === 'partially_accepted'
                                              ? '✅'
                                              : '❌'}
                                        {(judgeDecision.decision === 'accepted' || judgeDecision.decision === 'partially_accepted') && judgeDecision.requiresGuarantee && (
                                            <span className="text-[11px] bg-amber-500/15 border border-amber-500/25 text-amber-100 px-2 py-0.5 rounded-full">
                                                كفالة {guaranteeSubmitted ? 'مودعة' : 'مطلوبة'}
                                            </span>
                                        )}
                                        <ChevronDown
                                            size={18}
                                            className={`shrink-0 text-white/50 transition-transform duration-200 ${
                                                activeLifecycleStep === 'judge' ? 'rotate-180' : ''
                                            }`}
                                        />
                                    </div>
                                </button>
    );
}
