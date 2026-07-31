import {
    handlerClusterSourceBags,
    pickHandlerClusterKeys,
    type HandlerClusterContextSpreads,
} from './handlerClusterContextShared';

const FOUNDATION_HANDLER_CLUSTER_KEYS = [
    'decisionsStorageExecutionId',
    'decisionsReloadEpoch',
    'executionData',
    'executionDataRef',
    'executionId',
    'parentDossierId',
    'persistExecutionMerge',
    'showToast',
    'setTimelineEvents',
    'pushTimelineEventRef',
    'realEstateSeizureAssets',
    'realEstateSeizureModalDecisionId',
    'realEstateSeizureSnapshotRef',
    'nextTimelineId',
    'setRealEstateSeizureAssets',
    'setShowRealEstateSeizureModal',
    'getLocalTodayYmd',
    'setThirdPartySeizuresUi',
    'linkSeizureAuctionToAppointments',
    'pushSeizureAuctionCalendarAppointment',
] as const;

const DOSSIER_SUPPORT_HANDLER_CLUSTER_KEYS = Array.from(
    new Set([
        ...FOUNDATION_HANDLER_CLUSTER_KEYS,
        'classification',
        'closeDossierLifecyclePanel',
        'directorate',
        'docNumber',
        'dossierDateDraft',
        'dossierFileKey',
        'dossierPendingStatus',
        'dossierReasonDraft',
        'evictionFullAddressField',
        'evictionPremisesUseRaw',
        'evictionPropertyDistrict',
        'evictionPropertyNumber',
        'evictionPropertyTypeField',
        'fileNumber',
        'fileYear',
        'financialLedgerRef',
        'isEvictionExecutionModule',
        'judgmentDate',
        'onUpdate',
        'parentExecutionFile',
        'reconcileDossierLifecycle',
        'seizedAssetsSnapshotRef',
        'setDossierDateDraft',
        'setDossierLifecyclePanelOpen',
        'setDossierLifecyclePanelPhase',
        'setDossierPendingStatus',
        'setDossierReasonDraft',
        'setExecutionStorageTick',
    ]),
) as string[];

export function collectDossierSupportHandlerClusterContext(
    spreads: HandlerClusterContextSpreads,
): Record<string, unknown> {
    return pickHandlerClusterKeys(handlerClusterSourceBags(spreads), DOSSIER_SUPPORT_HANDLER_CLUSTER_KEYS);
}
