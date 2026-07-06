// @ts-nocheck
import { useExecutionDashboardRealEstateSeizureModalHandlers } from './useExecutionDashboardRealEstateSeizureModalHandlers';
import { useExecutionDashboardThirdPartySeizureHandlers } from './useExecutionDashboardThirdPartySeizureHandlers';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export function useExecutionDashboardCoreHandlerClusterFoundationSeizure(
    c: ExecutionDashboardCoreHandlerClusterInput,
    pushTimelineEvent: unknown,
) {
    const {
        decisionsStorageExecutionId,
        executionDataRef,
        realEstateSeizureAssets,
        realEstateSeizureModalDecisionId,
        realEstateSeizureSnapshotRef,
        nextTimelineId,
        setRealEstateSeizureAssets,
        setShowRealEstateSeizureModal,
        getLocalTodayYmd,
        showToast,
        setThirdPartySeizuresUi,
    } = c as Record<string, unknown>;

    const realEstateSeizureHandlers = useExecutionDashboardRealEstateSeizureModalHandlers({
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

    const thirdPartySeizureHandlers = useExecutionDashboardThirdPartySeizureHandlers({
        decisionsStorageExecutionId,
        executionDataRef,
        getLocalTodayYmd,
        nextTimelineId,
        pushTimelineEvent,
        showToast,
        setThirdPartySeizuresUi,
    });

    return {
        realEstateSeizureHandlers,
        thirdPartySeizureHandlers,
    };
}
