import {
    handlerClusterSourceBags,
    pickHandlerClusterKeys,
    type HandlerClusterContextSpreads,
} from './handlerClusterContextShared';

const FOUNDATION_TIMELINE_HANDLER_CLUSTER_KEYS = [
    'executionDataRef',
    'executionId',
    'parentDossierId',
    'persistExecutionMerge',
    'setTimelineEvents',
    'pushTimelineEventRef',
] as const;

const FOLLOWUP_OTHER_PARTY_HANDLER_CLUSTER_KEYS = Array.from(
    new Set([
        ...FOUNDATION_TIMELINE_HANDLER_CLUSTER_KEYS,
        'executionData',
        'executionDataRef',
        'executionId',
        'decisionsStorageExecutionId',
        'isRepresentingDebtor',
        'openDecisionsModalWithBoot',
        'timelineEvents',
        'nextTimelineId',
        'persistExecutionMerge',
        'showToast',
    ]),
) as string[];

export function collectFollowupOtherPartyHandlerClusterContext(
    spreads: HandlerClusterContextSpreads,
): Record<string, unknown> {
    return pickHandlerClusterKeys(
        handlerClusterSourceBags(spreads),
        FOLLOWUP_OTHER_PARTY_HANDLER_CLUSTER_KEYS,
    );
}
