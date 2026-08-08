import React from 'react';
import { ChevronDown } from '@/app/components/ui/lucideIcons';
import { ExecutionInlineAccordion } from './ExecutionInlineAccordion';
import { useSeizedPropertyWorkflowPanelState } from './seizedPropertyWorkflow/useSeizedPropertyWorkflowPanelState';
import type { SeizedPropertyWorkflowPanelProps } from './seizedPropertyWorkflow/seizedPropertyWorkflowTypes';

export type { SeizedPropertyWorkflowPanelProps } from './seizedPropertyWorkflow/seizedPropertyWorkflowTypes';

export const SeizedPropertyWorkflowPanel: React.FC<SeizedPropertyWorkflowPanelProps> = (props) => {
    const { workflowExpanded, setWorkflowExpanded, relevantPendingRows, steps, stepNavRequest } =
        useSeizedPropertyWorkflowPanelState(props);

    return (
        <div className="mt-3 border-t border-white/10 pt-3" dir="rtl">
            <button
                type="button"
                aria-expanded={workflowExpanded}
                onClick={() => setWorkflowExpanded((v) => !v)}
                className="flex w-full flex-row-reverse items-center justify-between gap-2 rounded-xl py-1 text-right transition hover:bg-white/5"
            >
                <span className="text-[11px] font-black text-[#E6C673]">إجراءات حجز العقار</span>
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-[#D4AF37]/85 transition-transform ${workflowExpanded ? 'rotate-180' : ''}`}
                />
            </button>

            {workflowExpanded ? (
                <div className="relative">
                    <ExecutionInlineAccordion
                        className={relevantPendingRows.length > 0 ? 'mt-2' : 'mt-3'}
                        steps={steps}
                        stepNavRequest={stepNavRequest}
                    />
                </div>
            ) : null}
        </div>
    );
};
