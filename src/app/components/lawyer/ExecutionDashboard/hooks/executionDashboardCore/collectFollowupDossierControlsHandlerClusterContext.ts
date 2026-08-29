import {
    handlerClusterSourceBags,
    pickHandlerClusterKeys,
    type HandlerClusterContextSpreads,
} from './handlerClusterContextShared';
import { FOUNDATION_TIMELINE_HANDLER_CLUSTER_KEYS } from './handlerClusterFoundationKeys';

const FOLLOWUP_DOSSIER_CONTROLS_HANDLER_CLUSTER_KEYS = Array.from(
    new Set([
        ...FOUNDATION_TIMELINE_HANDLER_CLUSTER_KEYS,
        'executionData',
        'decisionsStorageExecutionId',
        'isInabaActive',
        'isUnifiedTabActive',
        'parentExecutionFile',
        'setDossierActionModalOpen',
        'setDossierActionModalSaving',
        'setDossierActionModalType',
        'setExecutionStorageTick',
        'nextTimelineId',
        'persistExecutionMerge',
        'showToast',
    ]),
) as string[];

export function collectFollowupDossierControlsHandlerClusterContext(
    spreads: HandlerClusterContextSpreads,
): Record<string, unknown> {
    return pickHandlerClusterKeys(
        handlerClusterSourceBags(spreads),
        FOLLOWUP_DOSSIER_CONTROLS_HANDLER_CLUSTER_KEYS,
    );
}
