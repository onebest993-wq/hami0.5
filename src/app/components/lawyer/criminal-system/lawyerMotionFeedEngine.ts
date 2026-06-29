import type { JudicialDecision } from '@/app/types/criminal';
import type { LawyerRequest } from './criminalCaseModel';
import { parseEventDateKey } from './stageJourney';

export type LawyerMotionFeedRow =
    | { kind: 'pending_request'; id: string; sortMs: number; request: LawyerRequest }
    | { kind: 'decision'; id: string; sortMs: number; decision: JudicialDecision };

function resolveLawyerRequestSortMs(request: LawyerRequest): number {
    return parseEventDateKey(String(request.requestDate ?? ''));
}

function resolveDecisionSortMs(decision: JudicialDecision): number {
    return parseEventDateKey(String(decision.issuedAt ?? ''));
}

/** دمج طلبات المحامي (قيد النظر) مع قراراتها في السجل — بطاقة واحدة لكل طلب، الأحدث أولاً. */
export function buildLawyerMotionUnifiedFeed(
    pendingRequests: LawyerRequest[],
    decisions: JudicialDecision[],
): LawyerMotionFeedRow[] {
    const pendingIds = new Set(pendingRequests.map((r) => r.id));
    const rows: LawyerMotionFeedRow[] = pendingRequests.map((request) => ({
        kind: 'pending_request',
        id: `pending_${request.id}`,
        sortMs: resolveLawyerRequestSortMs(request),
        request,
    }));

    for (const decision of decisions) {
        const sourceRequestId = String(decision.sourceRequestId ?? '').trim();
        if (sourceRequestId && pendingIds.has(sourceRequestId)) continue;
        rows.push({
            kind: 'decision',
            id: decision.id,
            sortMs: resolveDecisionSortMs(decision),
            decision,
        });
    }

    return rows.sort((a, b) => b.sortMs - a.sortMs);
}

export function sortLawyerRequestsNewestFirst(requests: LawyerRequest[]): LawyerRequest[] {
    return [...requests].sort(
        (a, b) => resolveLawyerRequestSortMs(b) - resolveLawyerRequestSortMs(a),
    );
}
