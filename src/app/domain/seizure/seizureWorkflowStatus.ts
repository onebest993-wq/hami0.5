import {
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';

/** توحيد حالات العقار/المنقول في مسار الحجز الثماني */
export function normalizeSeizureWorkflowStatus(raw: string): string {
    if (raw === 'estimated') return 'valued';
    if (raw === 'auction_scheduled') return 'published';
    return raw;
}

/** @deprecated استخدم normalizeSeizureWorkflowStatus */
export function normalizePropertySeizureStatus(raw: string): string {
    return normalizeSeizureWorkflowStatus(raw);
}

export function stepStatusForIndex(
    idx: number,
    activeIdx: number,
): 'done' | 'active' | 'locked' {
    if (idx < activeIdx) return 'done';
    if (idx === activeIdx) return 'active';
    return 'locked';
}

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
