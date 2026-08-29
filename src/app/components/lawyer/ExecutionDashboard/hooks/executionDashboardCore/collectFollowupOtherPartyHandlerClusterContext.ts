import {
    handlerClusterSourceBags,
    pickHandlerClusterKeys,
    type HandlerClusterContextSpreads,
} from './handlerClusterContextShared';
import { FOUNDATION_TIMELINE_HANDLER_CLUSTER_KEYS } from './handlerClusterFoundationKeys';

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
) {
    return pickHandlerClusterKeys(handlerClusterSourceBags(spreads), FOLLOWUP_OTHER_PARTY_HANDLER_CLUSTER_KEYS);
}
