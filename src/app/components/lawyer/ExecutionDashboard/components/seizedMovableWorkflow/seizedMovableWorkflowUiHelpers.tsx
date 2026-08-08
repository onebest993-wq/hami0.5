import React from 'react';
import type { MovableExpertDecisionSubtype, MovableInlineSectionKey } from '../MovableSeizureInlineSections';
import {
    MOVABLE_WORKFLOW_ACTION_SHELL,
    MOVABLE_WORKFLOW_BTN,
} from './seizedMovableWorkflowConstants';

export function movableWorkflowActionClick(handler: () => void) {
    return (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handler();
    };
}

export function movableWorkflowInlineSaveShell(inline: React.ReactNode): React.ReactNode {
    if (!inline) return null;
    return <div className={MOVABLE_WORKFLOW_ACTION_SHELL}>{inline}</div>;
}

export function movableWorkflowDoneStepHistoryShell(
    lines: Array<{ label: string; value: string }>,
): React.ReactNode {
    return (
        <div className={MOVABLE_WORKFLOW_ACTION_SHELL}>
            <div className="space-y-2 rounded-xl border border-sky-500/15 bg-sky-950/10 p-3">
                <p className="text-[9px] font-bold text-sky-200/90 text-right">سجل الخطوة</p>
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

export function expertSubtypeForMovableWorkflowStep(
    stepIndex: number,
): MovableExpertDecisionSubtype | undefined {
    if (stepIndex === 1) return 'movable_expert';
    if (stepIndex === 3) return 'movable_expert_committee';
    return undefined;
}

export function inlineSectionForMovableWorkflowStep(stepIndex: number): MovableInlineSectionKey | null {
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

export function movableWorkflowApprovedInlineResume(
    message: string,
    onResume: () => void,
): React.ReactNode {
    return (
        <div className={MOVABLE_WORKFLOW_ACTION_SHELL}>
            <p className="text-[10px] font-bold text-sky-200/90 text-right leading-relaxed">{message}</p>
            <button
                type="button"
                onClick={movableWorkflowActionClick(onResume)}
                className={`${MOVABLE_WORKFLOW_BTN} border-sky-400/25 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15`}
            >
                أكمل التسجيل الآن
            </button>
        </div>
    );
}
