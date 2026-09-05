import {
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';

/** هل القرار قيد البت لدى المنفذ */
export function isDecisionPending(row: Record<string, unknown> | null): boolean {
    if (!row) return false;
    return (
        String(row?.executorOutcome ?? 'pending') === 'pending' ||
        String(row?.executorOutcome ?? '') === ''
    );
}

export function isDecisionResolvedApproved(
    row: Record<string, unknown> | null,
    allDecisions?: Record<string, unknown>[],
): boolean {
    if (!row) return false;
    if (isExecutorRowRejectedAndFinal(row as Record<string, unknown>)) return false;
    if (Array.isArray(allDecisions) && allDecisions.length > 0) {
        return isExecutorRowApprovedWorkflowActive(row, allDecisions);
    }
    return isExecutorRowEffectivelyApproved(row as Record<string, unknown>);
}
