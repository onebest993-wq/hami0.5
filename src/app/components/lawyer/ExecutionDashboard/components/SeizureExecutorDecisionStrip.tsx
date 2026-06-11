import React from 'react';
import {
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import { ExecutionInlineExecutorDecisionActions } from './ExecutionInlineAccordion';

export type SeizureExecutorDecisionStripProps = {
    executionId: string;
    row: Record<string, unknown>;
    onOpenAppeals?: (decisionId: string) => void;
};

export const SeizureExecutorDecisionStrip: React.FC<SeizureExecutorDecisionStripProps> = ({
    executionId,
    row,
    onOpenAppeals,
}) => {
    const decisionId = String(row?.id || '').trim();
    const exId = String(executionId || '').trim();
    if (!decisionId || !exId) return null;

    const rejected = isExecutorRowRejectedAndFinal(row as any);
    const pending =
        String(row?.executorOutcome ?? 'pending') === 'pending' ||
        String(row?.executorOutcome ?? '') === '';
    if (!pending && !rejected) return null;

    const title = String(row?.title || row?.requestTitle || 'قرار المنفذ').trim();

    return (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-950/20 p-2.5" dir="rtl">
            <p className="mb-2 text-[10px] font-black text-right text-amber-100 line-clamp-2">{title}</p>
            <ExecutionInlineExecutorDecisionActions
                executionId={exId}
                decisionId={decisionId}
                requestKind="seizure"
                disabled={rejected}
                onOpenAppealCenter={
                    rejected && onOpenAppeals ? () => onOpenAppeals(decisionId) : undefined
                }
            />
        </div>
    );
};
