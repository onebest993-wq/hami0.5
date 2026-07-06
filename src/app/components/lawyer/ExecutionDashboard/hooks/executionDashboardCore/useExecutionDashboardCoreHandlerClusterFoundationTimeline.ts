// @ts-nocheck
import { useExecutionDashboardPushTimelineEvent } from './useExecutionDashboardPushTimelineEvent';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export function useExecutionDashboardCoreHandlerClusterFoundationTimeline(
    c: ExecutionDashboardCoreHandlerClusterInput,
) {
    const {
        executionDataRef,
        executionId,
        parentDossierId,
        persistExecutionMerge,
        setTimelineEvents,
        pushTimelineEventRef,
    } = c as Record<string, unknown>;

    const pushTimelineEventBinding = useExecutionDashboardPushTimelineEvent({
        executionId,
        parentDossierId,
        executionDataRef,
        persistExecutionMerge,
        setTimelineEvents,
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
