import React from 'react';
import {
    isSeizureDecisionApprovedForPlanBadge,
    openSeizureApprovedPlanInTasks,
    seizureRequestTitleForSubtype,
} from '../utils/seizureApprovedPlanTask';

type SeizureApprovedPlanBadgeProps = {
    executionId: string | undefined;
    decision: Record<string, unknown> | null | undefined;
    subtype: string;
    requestTitle?: string;
};

/** شارة بجانب طلب حجز معتمد — تفتح المهام الرئيسية على خطة مرتبطة */
export function SeizureApprovedPlanBadge({
    executionId,
    decision,
    subtype,
    requestTitle,
}: SeizureApprovedPlanBadgeProps) {
    if (!isSeizureDecisionApprovedForPlanBadge(decision)) return null;
    const exId = String(executionId ?? '').trim();
    const decisionId = String(decision?.id ?? '').trim();
    if (!exId || !decisionId) return null;

    return (
        <button
            type="button"
            data-testid={`seizure-approved-plan-badge-${subtype}`}
            title="فتح خطة المتابعة في المهام"
            aria-label="فتح خطة المتابعة في المهام"
            onClick={(e) => {
                e.stopPropagation();
                openSeizureApprovedPlanInTasks({
                    executionId: exId,
                    decisionId,
                    subtype,
                    requestTitle: seizureRequestTitleForSubtype(subtype, requestTitle),
                    linkedQuantumTaskId: String(decision?.linkedQuantumTaskId ?? '').trim() || undefined,
                });
            }}
            className="min-h-[40px] min-w-[44px] shrink-0 rounded-xl border border-[#E6C673]/40 bg-[#E6C673]/12 px-2.5 text-[11px] font-extrabold text-[#E6C673] touch-manipulation"
        >
            خطة
        </button>
    );
}
