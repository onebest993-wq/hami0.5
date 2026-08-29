import React from 'react';
import { formatDateText } from '../../utils/formatters';
import type { GrievanceLifecyclePanelProps } from '../GrievanceLifecyclePanelProps';

export function GrievanceReadOnlySummaries(props: GrievanceLifecyclePanelProps) {
    const {
        caseData,
        defenderPhase2ReadOnly,
        defenderStateOrderSummaryDate,
        effectiveJudgeDecisionDate,
        grievanceDecision,
        grievanceLockedSummaryText,
        isFinalityNoGrievance,
        isFinalized,
    } = props;

    return (
<>
                                                    {isFinalized && (
                                                        <div className="border border-amber-500/25 bg-amber-500/10 rounded-xl px-4 py-3 text-amber-100 text-sm space-y-2">
                                                            <div className="font-extrabold">ملخص مرحلة التظلم (للاطلاع)</div>
                                                            {!!grievanceLockedSummaryText && <div>{grievanceLockedSummaryText}</div>}
                                                            {grievanceDecision.decision && (
                                                                <div>
                                                                    قرار التظلم:{' '}
                                                                    {grievanceDecision.decision === 'confirmed'
                                                                        ? 'تصديق القرار'
                                                                        : grievanceDecision.decision === 'modified'
                                                                          ? 'تعديل القرار'
                                                                          : 'نقض القرار'}{' '}
                                                                    — {formatDateText(grievanceDecision.decisionDate) || '—'}
                                                                </div>
                                                            )}
                                                            {caseData?.grievanceOutcome === 'expired' && (
                                                                <div>انقضاء مدة التظلم دون تقديم طعن</div>
                                                            )}
                                                            {isFinalityNoGrievance && <div>اكتساب الدرجة القطعية دون تقديم تظلم</div>}
                                                        </div>
                                                    )}

                                                    {defenderPhase2ReadOnly && !isFinalized && (
                                                        <div className="border border-white/10 bg-white/5 rounded-xl px-4 py-3 text-white/90 text-sm space-y-2">
                                                            <div className="font-extrabold text-white">ملخص مرحلة التظلم (سجل تاريخي)</div>
                                                            <div>
                                                                صدر الأمر الولائي غيابياً بتاريخ{' '}
                                                                {formatDateText(defenderStateOrderSummaryDate) ||
                                                                    formatDateText(effectiveJudgeDecisionDate) ||
                                                                    '—'}
                                                                ؛ والقرار المعترض عليه: رفض الطلب بتاريخ{' '}
                                                                {formatDateText(effectiveJudgeDecisionDate) || '—'}.
                                                            </div>
                                                            {(grievanceDecision.decision || caseData?.grievanceDecision) && (
                                                                <div>
                                                                    قرار التظلم:{' '}
                                                                    {(grievanceDecision.decision || caseData?.grievanceDecision) === 'confirmed'
                                                                        ? 'تصديق القرار'
                                                                        : (grievanceDecision.decision || caseData?.grievanceDecision) === 'modified'
                                                                          ? 'تعديل القرار'
                                                                          : 'نقض القرار'}{' '}
                                                                    —{' '}
                                                                    {formatDateText(
                                                                        String(
                                                                            grievanceDecision.decisionDate ||
                                                                                caseData?.grievanceDecisionDate ||
                                                                                '',
                                                                        ),
                                                                    ) || '—'}
                                                                </div>
                                                            )}
                                                            {!!grievanceLockedSummaryText && (
                                                                <div className="text-white/70 text-xs">{grievanceLockedSummaryText}</div>
                                                            )}
                                                            <div className="text-white/50 text-xs">
                                                                مؤمن للتعديل لأن نقطة الدخول كانت عند التمييز؛ أكمل الإجراء في مرحلة الطعن التمييزي.
                                                            </div>
                                                        </div>
                                                    )}
</>
    );
}
