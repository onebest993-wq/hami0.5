// @ts-nocheck
import { useExecutionDashboardCoreHandlerClusterFoundationTimeline } from './useExecutionDashboardCoreHandlerClusterFoundationTimeline';
import { useExecutionDashboardOtherPartyHandlers } from './useExecutionDashboardOtherPartyHandlers';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export function useExecutionDashboardCoreHandlerClusterFollowupOtherParty(
    c: ExecutionDashboardCoreHandlerClusterInput,
) {
    const { pushTimelineEventBinding, pushTimelineEvent } =
        useExecutionDashboardCoreHandlerClusterFoundationTimeline(c);

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
    } = c as any;

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
