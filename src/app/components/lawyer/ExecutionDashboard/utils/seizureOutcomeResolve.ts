import { getExecutorDecisionRowById } from '@/app/utils/executorSeizureDecisionQueue';
import { collectDecisionsStorageCandidateIds } from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/resolveDecisionsStorageExecutionId';
import { readSeizureRequestTarget } from '@/app/utils/executorSeizureDecisionQueue';
import { resolveSeizureOutcomeRow, type ResolvedSeizureOutcomeRow } from '@/app/domain/seizure/seizureOutcomeRouter';
import type { SeizureDecisionOutcomeContext, SeizureDecisionOutcomeDetail } from './seizureDecisionOutcomeHandler.types';

export type SeizureOutcomeResolvedEvent = {
    myId: string;
    storageId: string;
    evId: string;
    decisionId: string;
    decisionRow: Record<string, unknown>;
    resolved: ResolvedSeizureOutcomeRow;
    requestKind: string;
    savedAtEarly: string;
    seizureTarget: string;
    dispatchId: string;
};

export function resolveSeizureOutcomeEvent(
    detail: SeizureDecisionOutcomeDetail | undefined,
    ctx: SeizureDecisionOutcomeContext,
): SeizureOutcomeResolvedEvent | null {
    const myId = String(ctx.executionDataId ?? ctx.executionId ?? '').trim();
    const storageId = String(ctx.decisionsStorageExecutionId ?? '').trim();
    const evId = String(detail?.executionId ?? '').trim();
    const allowedIds = new Set(
        collectDecisionsStorageCandidateIds(
            storageId || myId,
            ctx.executionDataRef.current as Record<string, unknown> | null | undefined,
            [myId, storageId, String(ctx.executionId ?? '').trim(), evId],
        ),
    );
    if (!evId || !allowedIds.has(evId)) return null;
    if (String(detail?.outcome || '') !== 'approved') return null;
    const decisionId = String(detail?.decisionId ?? '').trim();
    if (!decisionId) return null;

    let decisionRow: Record<string, unknown> | null = null;
    for (const lookupId of [storageId, myId, evId]) {
        if (!lookupId) continue;
        const hit = getExecutorDecisionRowById(lookupId, decisionId) as Record<string, unknown> | null;
        if (hit) {
            decisionRow = hit;
            break;
        }
    }
    if (!decisionRow) return null;

    const resolved = resolveSeizureOutcomeRow(decisionRow);
    const requestKind = String(detail?.requestKind ?? resolved.requestKind).trim();

    return {
        myId,
        storageId,
        evId,
        decisionId,
        decisionRow,
        resolved,
        requestKind,
        savedAtEarly: resolved.savedAtEarly,
        seizureTarget: readSeizureRequestTarget(decisionRow),
        dispatchId: String(storageId || myId || evId).trim(),
    };
}
