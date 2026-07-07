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
        delegationParentFileId,
        activeSubFileId,
        persistExecutionMerge,
        setTimelineEvents,
        pushTimelineEventRef,
    } = c as Record<string, unknown>;

    const pushTimelineEventBinding = useExecutionDashboardPushTimelineEvent({
        executionId,
        parentDossierId,
        delegationParentFileId,
        activeSubFileId,
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
