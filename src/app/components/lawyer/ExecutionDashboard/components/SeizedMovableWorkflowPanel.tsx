import React from 'react';
import { ChevronDown } from '@/app/components/ui/lucideIcons';
import { ExecutionInlineAccordion } from './ExecutionInlineAccordion';
import { useSeizedMovableWorkflowPanelState } from './seizedMovableWorkflow/useSeizedMovableWorkflowPanelState';
import type { SeizedMovableWorkflowPanelProps } from './seizedMovableWorkflow/seizedMovableWorkflowTypes';

export type { SeizedMovableWorkflowPanelProps } from './seizedMovableWorkflow/seizedMovableWorkflowTypes';

export function SeizedMovableWorkflowPanel(props: SeizedMovableWorkflowPanelProps) {
    const { workflowExpanded, setWorkflowExpanded, relevantPendingRows, steps, stepNavRequest } =
        useSeizedMovableWorkflowPanelState(props);

    return (
        <div className="mt-3 border-t border-white/10 pt-3" dir="rtl">
            <button
                type="button"
                aria-expanded={workflowExpanded}
                onClick={() => setWorkflowExpanded((v) => !v)}
                className="flex w-full flex-row-reverse items-center justify-between gap-2 rounded-xl py-1 text-right transition hover:bg-white/5"
            >
                <span className="text-[11px] font-black text-sky-200">إجراءات حجز المنقول</span>
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-sky-300/85 transition-transform ${workflowExpanded ? 'rotate-180' : ''}`}
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
}
