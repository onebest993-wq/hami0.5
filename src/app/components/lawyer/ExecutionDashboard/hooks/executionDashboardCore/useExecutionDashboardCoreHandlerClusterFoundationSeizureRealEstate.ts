import { useExecutionDashboardRealEstateSeizureModalHandlers } from './useExecutionDashboardRealEstateSeizureModalHandlers';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';
import type { UseExecutionDashboardRealEstateSeizureModalHandlersParams } from './useExecutionDashboardRealEstateSeizureModalHandlers';

type FoundationSeizureRealEstateInput = Pick<
    UseExecutionDashboardRealEstateSeizureModalHandlersParams,
    | 'decisionsStorageExecutionId'
    | 'realEstateSeizureAssets'
    | 'realEstateSeizureModalDecisionId'
    | 'realEstateSeizureSnapshotRef'
    | 'nextTimelineId'
    | 'showToast'
    | 'setRealEstateSeizureAssets'
    | 'setShowRealEstateSeizureModal'
>;

export function useExecutionDashboardCoreHandlerClusterFoundationSeizureRealEstate(
    c: ExecutionDashboardCoreHandlerClusterInput,
    pushTimelineEvent: UseExecutionDashboardRealEstateSeizureModalHandlersParams['pushTimelineEvent'],
) {
    const {
        decisionsStorageExecutionId,
        realEstateSeizureAssets,
        realEstateSeizureModalDecisionId,
        realEstateSeizureSnapshotRef,
        nextTimelineId,
        setRealEstateSeizureAssets,
        setShowRealEstateSeizureModal,
        showToast,
    } = c as FoundationSeizureRealEstateInput;

    return useExecutionDashboardRealEstateSeizureModalHandlers({
        decisionsStorageExecutionId,
        realEstateSeizureAssets,
        realEstateSeizureModalDecisionId,
        realEstateSeizureSnapshotRef,
        nextTimelineId,
        pushTimelineEvent,
        showToast,
        setRealEstateSeizureAssets,
        setShowRealEstateSeizureModal,
    });
}
