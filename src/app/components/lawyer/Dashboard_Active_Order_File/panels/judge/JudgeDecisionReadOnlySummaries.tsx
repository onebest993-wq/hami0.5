import React from 'react';
import { formatDateText } from '../../utils/formatters';
import type { JudgeDecisionLifecyclePanelProps } from '../JudgeDecisionLifecyclePanelProps';

export function JudgeDecisionReadOnlySummaries(props: JudgeDecisionLifecyclePanelProps) {
    const {
        defenderPhase1ReadOnly,
        defenderStateOrderSummaryDate,
        effectiveJudgeDecision,
        effectiveJudgeDecisionDate,
        fileStatus,
        guaranteeSubmitted,
        hasSessions,
        isFinalized,
        judgeDecision,
        preDecisionHearingsSorted,
        showPreDecisionHearings,
    } = props;

    const judgePhaseComplete = fileStatus !== 'pending' && !!effectiveJudgeDecision;

    return (
<>
                                            {isFinalized && (
                                                <div className="mb-4 border border-amber-500/25 bg-amber-500/10 rounded-xl px-4 py-3 text-amber-100 text-sm space-y-1">
                                                    <div className="font-extrabold">ملخص مرحلة قرار القاضي (للاطلاع)</div>
                                                    <div>
                                                        القرار:{' '}
                                                        {effectiveJudgeDecision === 'accepted'
                                                            ? 'إجابة الطلب'
                                                            : effectiveJudgeDecision === 'partially_accepted'
                                                              ? 'إجابة جزئية'
                                                              : effectiveJudgeDecision === 'rejected'
                                                                ? 'رفض الطلب'
                                                                : '—'}
                                                    </div>
                                                    <div>التاريخ: {formatDateText(effectiveJudgeDecisionDate) || '—'}</div>
                                                    {(effectiveJudgeDecision === 'accepted' || effectiveJudgeDecision === 'partially_accepted') && (
                                                        <div>
                                                            الكفالة: {judgeDecision.requiresGuarantee ? (guaranteeSubmitted ? 'مودعة' : 'مطلوبة') : 'غير مطلوبة'}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {defenderPhase1ReadOnly && !isFinalized && (
                                                <div className="mb-4 border border-white/10 bg-white/5 rounded-xl px-4 py-3 text-white/90 text-sm space-y-2">
                                                    <div className="font-extrabold text-white">ملخص المرحلة البدائية (أمر ولائي غيابي — للاطلاع)</div>
                                                    <div>
                                                        صدر الأمر غيابياً بتاريخ{' '}
                                                        {formatDateText(defenderStateOrderSummaryDate) ||
                                                            formatDateText(effectiveJudgeDecisionDate) ||
                                                            '—'}
                                                        .
                                                    </div>
                                                    <div className="text-white/70 text-xs">
                                                        مؤمن: التعديل على الجلسات وقرار المرحلة الأولى؛ تابع الإجراء من المرحلة النشطة التالية.
                                                    </div>
                                                </div>
                                            )}
                                            {judgePhaseComplete && !isFinalized && !defenderPhase1ReadOnly && (
                                                <div className="mb-4 border border-white/10 bg-black/20 rounded-xl px-4 py-3 text-white/80 text-xs font-bold space-y-2">
                                                    <div className="text-white font-extrabold text-sm">ملخص قرار القاضي</div>
                                                    <div>
                                                        القرار:{' '}
                                                        {effectiveJudgeDecision === 'accepted'
                                                            ? 'إجابة الطلب'
                                                            : effectiveJudgeDecision === 'partially_accepted'
                                                              ? 'إجابة جزئية'
                                                              : effectiveJudgeDecision === 'rejected'
                                                                ? 'رفض الطلب'
                                                                : '—'}
                                                    </div>
                                                    <div>التاريخ: {formatDateText(effectiveJudgeDecisionDate) || '—'}</div>
                                                    {showPreDecisionHearings && hasSessions ? (
                                                        <div>عدد جلسات ما قبل القرار: {preDecisionHearingsSorted.length}</div>
                                                    ) : null}
                                                </div>
                                            )}
</>
    );
}
