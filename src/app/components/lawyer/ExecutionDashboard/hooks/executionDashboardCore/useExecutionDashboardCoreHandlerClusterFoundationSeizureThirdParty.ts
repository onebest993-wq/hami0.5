import { useExecutionDashboardThirdPartySeizureHandlers } from './useExecutionDashboardThirdPartySeizureHandlers';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

type ThirdPartySeizureHandlerInput = Parameters<typeof useExecutionDashboardThirdPartySeizureHandlers>[0];

export function useExecutionDashboardCoreHandlerClusterFoundationSeizureThirdParty(
    c: ExecutionDashboardCoreHandlerClusterInput,
    pushTimelineEvent: ThirdPartySeizureHandlerInput['pushTimelineEvent'],
) {
    const {
        decisionsStorageExecutionId,
        executionDataRef,
        getLocalTodayYmd,
        nextTimelineId,
        showToast,
        setThirdPartySeizuresUi,
    } = c as Pick<
        ThirdPartySeizureHandlerInput,
        | 'decisionsStorageExecutionId'
        | 'executionDataRef'
        | 'getLocalTodayYmd'
        | 'nextTimelineId'
        | 'showToast'
        | 'setThirdPartySeizuresUi'
    >;

    return useExecutionDashboardThirdPartySeizureHandlers({
        decisionsStorageExecutionId,
        executionDataRef,
        getLocalTodayYmd,
        nextTimelineId,
        pushTimelineEvent,
        showToast,
        setThirdPartySeizuresUi,
    });
}
