import React from 'react';
import type { JudicialDecision } from '@/app/types/criminal';
import {
    formatJudicialAppealAppellantLabel,
    formatJudicialAppealPathLabel,
    isCassationAppealResultFinalized,
    normalizeJudicialAppealPath,
} from '../judicialDecisionsEngine';
import { formatCassationResultShortLabel } from '../cassationJudicialForm';

export type DecisionCassationAppealsPanelProps = {
    decision: JudicialDecision;
    partyLabel: (id: string) => string;
};

/**
 * قائمة الطعون/التدخلات/التصحيحات المسجّلة على بطاقة القرار — مع اسم مقدّم الإجراء.
 */
export const DecisionCassationAppealsPanel = ({ decision, partyLabel }: DecisionCassationAppealsPanelProps) => {
    const appeals = Array.isArray(decision.appeals) ? decision.appeals : [];
    const finalDeclared = decision.isJudgmentFinalDeclared === true;

    if (!appeals.some((a) => normalizeJudicialAppealPath(a.appealPath) === 'ordinary') && !finalDeclared) {
        return null;
    }

    const declarerLabel = (() => {
        const manual = String(decision.judgmentFinalDeclaredByLabel ?? '').trim();
        if (manual) return manual;
        const ids = Array.isArray(decision.judgmentFinalDeclaredByIds)
            ? decision.judgmentFinalDeclaredByIds
            : [];
        const names = ids.map(partyLabel).filter((n) => n && n !== '—');
        return names.length ? names.join('، ') : '—';
    })();

    return (
        <div className="rounded-xl border border-[#E6C673]/30 bg-[#E6C673]/8 p-3 space-y-2">
            <div className="text-[#E6C673] font-black text-xs whitespace-normal break-words">
                سجل الطعون والإجراءات التمييزية
            </div>
            {appeals
                .filter((appeal) => normalizeJudicialAppealPath(appeal.appealPath) === 'ordinary')
                .map((appeal) => {
                const path = normalizeJudicialAppealPath(appeal.appealPath);
                const appellant = formatJudicialAppealAppellantLabel(appeal, partyLabel);
                const finalized = isCassationAppealResultFinalized(appeal);
                const resultLabel = finalized
                    ? formatCassationResultShortLabel(
                          typeof appeal.result === 'string' ? appeal.result : '',
                      )
                    : '';
                const statusLabel = finalized
                    ? `منتهٍ — ${resultLabel || 'نتيجة مسجّلة'}`
                    : 'قيد التدقيق التمييزي — بانتظار النتيجة';
                return (
                    <div
                        key={appeal.id}
                        className="rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 space-y-0.5"
                    >
                        <div className="text-[11px] font-black text-white whitespace-normal break-words">
                            {formatJudicialAppealPathLabel(path)}
                        </div>
                        <div className="text-[10px] font-bold text-white/70 whitespace-normal break-words">
                            من قام بالإجراء: {appellant}
                        </div>
                        <div
                            className={`text-[10px] font-bold whitespace-normal break-words ${
                                finalized ? 'text-emerald-200/90' : 'text-amber-100/90'
                            }`}
                        >
                            {statusLabel}
                        </div>
                    </div>
                );
            })}
            {finalDeclared ? (
                <div className="rounded-lg border border-emerald-500/35 bg-emerald-950/20 px-3 py-2 space-y-0.5">
                    <div className="text-[11px] font-black text-emerald-100 whitespace-normal break-words">
                        ✓ إعلان حكم بات — مُختتم
                    </div>
                    <div className="text-[10px] font-bold text-emerald-100/80 whitespace-normal break-words">
                        أعلنه: {declarerLabel}
                        {decision.judgmentFinalDeclaredAt ? (
                            <span aria-hidden> • </span>
                        ) : null}
                        {decision.judgmentFinalDeclaredAt ? (
                            <span>{decision.judgmentFinalDeclaredAt}</span>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    );
};
