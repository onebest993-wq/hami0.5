import { useExecutionDashboardCoreHandlerClusterFoundationTimeline } from './useExecutionDashboardCoreHandlerClusterFoundationTimeline';
import { useExecutionDashboardOtherPartyHandlers } from './useExecutionDashboardOtherPartyHandlers';
import { asHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';
import type { FollowupOtherPartyHandlerClusterInput } from './followupOtherPartyHandlerClusterInput';

export function useExecutionDashboardCoreHandlerClusterFollowupOtherParty(
    c: FollowupOtherPartyHandlerClusterInput,
) {
    const { pushTimelineEventBinding, pushTimelineEvent } =
        useExecutionDashboardCoreHandlerClusterFoundationTimeline(asHandlerClusterInput(c));

    const {
        executionDataRef,
        executionData,
        executionId,
        decisionsStorageExecutionId,
        isRepresentingDebtor,
        timelineEvents,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        openDecisionsModalWithBoot,
        setTimelineEvents,
    } = c;

    const dossierFollowupHandlers = useExecutionDashboardOtherPartyHandlers({
        executionDataRef,
        executionData,
        executionId,
        decisionsStorageExecutionId,
        isRepresentingDebtor,
        timelineEvents,
        nextTimelineId,
        pushTimelineEvent,
        persistExecutionMerge,
        showToast,
        openDecisionsModalWithBoot,
        setTimelineEvents,
    });

    return {
        pushTimelineEventBinding,
        pushTimelineEvent,
        dossierFollowupHandlers,
    };
}
