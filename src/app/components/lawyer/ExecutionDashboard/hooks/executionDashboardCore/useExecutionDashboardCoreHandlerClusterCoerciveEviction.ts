import { useExecutionDashboardCoreHandlerClusterFoundationTimeline } from './useExecutionDashboardCoreHandlerClusterFoundationTimeline';
import { useExecutionDashboardCoreHandlerClusterEviction } from './useExecutionDashboardCoreHandlerClusterEviction';
import type {
    ExecutionDashboardCoreHandlerClusterInput,
    HandlerClusterPushTimelineDeps,
} from './executionDashboardCoreHandlerClusterTypes';

export function useExecutionDashboardCoreHandlerClusterCoerciveEviction(
    c: ExecutionDashboardCoreHandlerClusterInput,
) {
    const timeline = useExecutionDashboardCoreHandlerClusterFoundationTimeline(c);
    const { pushTimelineEventBinding, pushTimelineEvent } = timeline;

    const eviction = useExecutionDashboardCoreHandlerClusterEviction(c, {
        pushTimelineEvent,
    } as HandlerClusterPushTimelineDeps);

    return {
        pushTimelineEventBinding,
        pushTimelineEvent,
        ...eviction,
    };
}
