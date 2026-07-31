import {
    handlerClusterSourceBags,
    pickHandlerClusterKeys,
    type HandlerClusterContextSpreads,
} from './handlerClusterContextShared';

const THIRD_PARTY_SEIZURE_HANDLER_CLUSTER_KEYS = [
    'decisionsStorageExecutionId',
    'executionDataRef',
    'executionId',
    'parentDossierId',
    'delegationParentFileId',
    'activeSubFileId',
    'persistExecutionMerge',
    'setTimelineEvents',
    'pushTimelineEventRef',
    'showToast',
    'nextTimelineId',
    'getLocalTodayYmd',
    'setThirdPartySeizuresUi',
] as const;

export function collectThirdPartySeizureHandlerClusterContext(
    spreads: HandlerClusterContextSpreads,
): Record<string, unknown> {
    return pickHandlerClusterKeys(
        handlerClusterSourceBags(spreads),
        THIRD_PARTY_SEIZURE_HANDLER_CLUSTER_KEYS,
    );
}
