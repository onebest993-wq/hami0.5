import React from 'react';
import type { PropertyExpertDecisionSubtype, PropertyInlineSectionKey } from './PropertySeizureInlineSections';

const BTN =
    'relative z-[2] w-full rounded-2xl border px-3 py-3 text-[11px] font-black transition-colors disabled:opacity-40 pointer-events-auto';

const ACTION_SHELL = 'relative z-[2] space-y-2 pointer-events-auto';

const PATH_HINT = 'text-[10px] font-bold text-slate-500 text-right';

function actionClick(handler: () => void) {
    return (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handler();
    };
}

function inlineSaveShell(inline: React.ReactNode): React.ReactNode {
    if (!inline) return null;
    return <div className={ACTION_SHELL}>{inline}</div>;
}

function doneStepHistoryShell(lines: Array<{ label: string; value: string }>): React.ReactNode {
    return (
        <div className={ACTION_SHELL}>
            <div className="space-y-2 rounded-xl border border-emerald-500/15 bg-emerald-950/10 p-3">
                <p className="text-[9px] font-bold text-emerald-200/90 text-right">سجل الخطوة</p>
                {lines.length === 0 ? (
                    <p className="text-[10px] text-slate-500 text-right">لا توجد تفاصيل مسجّلة.</p>
                ) : (
                    <div className="space-y-1.5">
                        {lines.map((row) => (
                            <div key={`${row.label}-${row.value}`} className="text-right leading-relaxed">
                                <span className="text-[9px] font-bold text-slate-400">{row.label}: </span>
                                <span className="text-[10px] text-slate-100 whitespace-pre-wrap">{row.value}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function expertSubtypeForWorkflowStep(stepIndex: number): PropertyExpertDecisionSubtype | undefined {
    if (stepIndex === 1) return 'property_expert';
    if (stepIndex === 3) return 'property_expert_committee';
    return undefined;
}

function inlineSectionForStep(stepIndex: number): PropertyInlineSectionKey | null {
    switch (stepIndex) {
        case 0:
            return 'mark';
        case 1:
        case 3:
            return 'experts';
        case 2:
        case 6:
            return 'auction';
        case 4:
            return 'publication';
        case 5:
            return 'auction_result';
        case 7:
            return 'reauction_default';
        default:
            return null;
    }
}

export {
    BTN,
    ACTION_SHELL,
    PATH_HINT,
    actionClick,
    inlineSaveShell,
    doneStepHistoryShell,
    expertSubtypeForWorkflowStep,
    inlineSectionForStep,
};
