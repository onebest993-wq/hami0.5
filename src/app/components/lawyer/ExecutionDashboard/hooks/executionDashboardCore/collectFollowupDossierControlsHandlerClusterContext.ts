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
