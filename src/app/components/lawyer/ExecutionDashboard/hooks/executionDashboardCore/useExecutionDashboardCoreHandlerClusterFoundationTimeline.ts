import { useExecutionDashboardPushTimelineEvent, type UseExecutionDashboardPushTimelineEventParams } from './useExecutionDashboardPushTimelineEvent';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export function useExecutionDashboardCoreHandlerClusterFoundationTimeline(
    c: ExecutionDashboardCoreHandlerClusterInput,
) {
    const {
        executionDataRef,
        executionId,
        parentDossierId,
        delegationParentFileId,
        activeSubFileId,
        persistExecutionMerge,
        setTimelineEvents,
        pushTimelineEventRef,
        timelineEventsRef,
    } = c;

    const pushTimelineEventBinding = useExecutionDashboardPushTimelineEvent({
        executionId,
        parentDossierId,
        delegationParentFileId,
        activeSubFileId,
        executionDataRef,
        persistExecutionMerge,
        setTimelineEvents,
        timelineEventsRef: timelineEventsRef as UseExecutionDashboardPushTimelineEventParams['timelineEventsRef'],
    });

    const { pushTimelineEvent } = pushTimelineEventBinding;

    if (pushTimelineEventRef) {
        (pushTimelineEventRef as { current?: unknown }).current = pushTimelineEvent;
    }

    return {
        pushTimelineEventBinding,
        pushTimelineEvent,
    };
}
