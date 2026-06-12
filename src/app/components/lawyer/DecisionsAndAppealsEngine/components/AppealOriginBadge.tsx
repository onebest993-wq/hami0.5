import React from 'react';
import DecisionHintTooltip from './DecisionHintTooltip';
import type { Decision } from '../types';
import type { AppealUiPerspective } from '../appealUiLabels';
import { isCreditorInitiatedExecutorRequest, resolveRequestFilerFromDebtorAgentView } from '../utils';

export function AppealOriginBadge({
    decision,
    perspective = 'creditor_agent',
}: {
    decision: Decision;
    perspective?: AppealUiPerspective;
}) {
    if (decision.manualExecutorLedgerEntry) {
        return (
            <DecisionHintTooltip label="قرار منفذ العدل أُدخل يدوياً عبر «إضافة قرار»">
                <span className="inline-block max-w-[100%] shrink-0 cursor-default rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium leading-tight text-amber-200">
                    قرار المنفذ
                </span>
            </DecisionHintTooltip>
        );
    }
    const executorOrderBlob = `${String(decision.title || '')} ${String(decision.body || '')}`;
    const isExecutorOrderDecision =
        decision.activatedByExecutorOrder === true ||
        /بقرار\s*المنفذ\s*العدل|قرار\s*المنفذ\s*العدل|بقرار\s*منفذ\s*العدل/i.test(executorOrderBlob);
    if (isExecutorOrderDecision) {
        return (
            <DecisionHintTooltip label="إجراء مُفعَّل بقرار منفذ العدل — دون طلب مسبق من الدائن">
                <span className="inline-block max-w-[100%] shrink-0 cursor-default rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium leading-tight text-amber-200">
                    قرار المنفذ العدل
                </span>
            </DecisionHintTooltip>
        );
    }
    if (decision.appealRequestOrigin === 'executor_side') {
        return (
            <DecisionHintTooltip label="قرار صادر من المنفذ دون طلب مسبق من الدائن أو المدين — اختر من بادر بالطعن">
                <span className="inline-block max-w-[100%] shrink-0 cursor-default rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium leading-tight text-slate-300">
                    قرار منفذ
                </span>
            </DecisionHintTooltip>
        );
    }
    const filer =
        perspective === 'debtor_agent'
            ? resolveRequestFilerFromDebtorAgentView(decision)
            : isCreditorInitiatedExecutorRequest(decision)
              ? 'creditor'
              : decision.appealRequestOrigin === 'debtor_side'
                ? 'debtor'
                : 'creditor';
    const debtor = filer === 'debtor';
    if (perspective === 'debtor_agent') {
        if (filer === 'creditor') {
            return (
                <DecisionHintTooltip label="طلب مقدّم من وكيل الدائن — موافقة المنفذ تضر بموكّلنا">
                    <span className="inline-block max-w-[100%] shrink-0 cursor-default rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium leading-tight text-rose-300">
                        طلب الدائن
                    </span>
                </DecisionHintTooltip>
            );
        }
        if (filer === 'debtor') {
            return (
                <DecisionHintTooltip label="طلب مقدّم من موكّلنا (المدين)">
                    <span className="inline-block max-w-[100%] shrink-0 cursor-default rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium leading-tight text-emerald-300">
                        طلب موكّلنا
                    </span>
                </DecisionHintTooltip>
            );
        }
    }
    if (debtor) {
        return (
            <DecisionHintTooltip label="طلب مسجّل من جهة المدين أو الطرف الآخر — مسار الطعن يختلف عن طلباتنا">
                <span className="inline-block max-w-[100%] shrink-0 cursor-default rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium leading-tight text-orange-400">
                    مقدم من الطرف الآخر
                </span>
            </DecisionHintTooltip>
        );
    }
    return (
        <DecisionHintTooltip label="طلب مسجّل لصالح الدائن/المحامي (قبلنا في التنفيذ)">
            <span className="inline-block max-w-[100%] shrink-0 cursor-default rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium leading-tight text-blue-400">
                مقدم من قبلنا
            </span>
        </DecisionHintTooltip>
    );
}


