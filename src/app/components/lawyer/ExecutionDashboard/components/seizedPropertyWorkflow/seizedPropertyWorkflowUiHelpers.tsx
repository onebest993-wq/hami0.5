import React from 'react';
import type { PropertyExpertDecisionSubtype, PropertyInlineSectionKey } from '../PropertySeizureInlineSections';
import {
    PROPERTY_WORKFLOW_ACTION_SHELL,
    PROPERTY_WORKFLOW_BTN,
} from './seizedPropertyWorkflowConstants';

export function propertyWorkflowActionClick(handler: () => void) {
    return (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handler();
    };
}

export function propertyWorkflowInlineSaveShell(inline: React.ReactNode): React.ReactNode {
    if (!inline) return null;
    return <div className={PROPERTY_WORKFLOW_ACTION_SHELL}>{inline}</div>;
}

export function propertyWorkflowDoneStepHistoryShell(
    lines: Array<{ label: string; value: string }>,
): React.ReactNode {
    return (
        <div className={PROPERTY_WORKFLOW_ACTION_SHELL}>
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

export function expertSubtypeForPropertyWorkflowStep(
    stepIndex: number,
): PropertyExpertDecisionSubtype | undefined {
    if (stepIndex === 1) return 'property_expert';
    if (stepIndex === 3) return 'property_expert_committee';
    return undefined;
}

export function inlineSectionForPropertyWorkflowStep(stepIndex: number): PropertyInlineSectionKey | null {
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

export function propertyWorkflowApprovedInlineResume(
    message: string,
    onResume: () => void,
): React.ReactNode {
    return (
        <div className={PROPERTY_WORKFLOW_ACTION_SHELL}>
            <p className="text-[10px] font-bold text-emerald-200/90 text-right leading-relaxed">{message}</p>
            <button
                type="button"
                onClick={propertyWorkflowActionClick(onResume)}
                className={`${PROPERTY_WORKFLOW_BTN} border-emerald-400/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15`}
            >
                متابعة التسجيل
            </button>
        </div>
    );
}
