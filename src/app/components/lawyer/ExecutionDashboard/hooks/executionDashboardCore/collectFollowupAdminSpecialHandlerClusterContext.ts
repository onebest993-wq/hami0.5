import {
    handlerClusterSourceBags,
    pickHandlerClusterKeys,
    type HandlerClusterContextSpreads,
} from './handlerClusterContextShared';
import { FOUNDATION_TIMELINE_HANDLER_CLUSTER_KEYS } from './handlerClusterFoundationKeys';

const FOLLOWUP_ADMIN_SPECIAL_HANDLER_CLUSTER_KEYS = Array.from(
    new Set([
        ...FOUNDATION_TIMELINE_HANDLER_CLUSTER_KEYS,
        'decisionsStorageExecutionId',
        'executionData',
        'nextTimelineId',
        'showToast',
        'specialRequestContent',
        'specialRequestDate',
        'specialRequestManualTitle',
        'setSpecialRequestContent',
        'setSpecialRequestDate',
        'setSpecialRequestManualTitle',
        'setSpecialRequestTemplatePick',
    ]),
) as string[];

export function collectFollowupAdminSpecialHandlerClusterContext(
    spreads: HandlerClusterContextSpreads,
): Record<string, unknown> {
    return pickHandlerClusterKeys(handlerClusterSourceBags(spreads), FOLLOWUP_ADMIN_SPECIAL_HANDLER_CLUSTER_KEYS);
}
