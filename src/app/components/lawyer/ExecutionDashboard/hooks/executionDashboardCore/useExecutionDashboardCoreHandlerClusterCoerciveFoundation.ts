import { useExecutionDashboardCoreHandlerClusterFoundationCore } from './useExecutionDashboardCoreHandlerClusterFoundationCore';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export function useExecutionDashboardCoreHandlerClusterCoerciveFoundation(
    c: ExecutionDashboardCoreHandlerClusterInput,
) {
    const foundation = useExecutionDashboardCoreHandlerClusterFoundationCore(c);
    const { pushTimelineEventBinding, pushTimelineEvent } = foundation;

    return {
        pushTimelineEventBinding,
        pushTimelineEvent,
    };
}
