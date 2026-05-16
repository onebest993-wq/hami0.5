import React from 'react';
import DecisionHintTooltip from './DecisionHintTooltip';
import type { Decision } from '../types';

export function AppealOriginBadge({ decision }: { decision: Decision }) {
    if (decision.manualExecutorLedgerEntry) {
        return null;
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
    const debtor = decision.appealRequestOrigin === 'debtor_side';
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


