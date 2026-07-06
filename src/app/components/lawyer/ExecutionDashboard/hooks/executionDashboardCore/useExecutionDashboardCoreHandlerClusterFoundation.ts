// @ts-nocheck
/** Phase B Slice 1 — timeline + seizure modal foundation (extracted from handler cluster) */
import { useExecutionDashboardCoreHandlerClusterFoundationCore } from './useExecutionDashboardCoreHandlerClusterFoundationCore';
import { useExecutionDashboardCoreHandlerClusterFoundationSeizure } from './useExecutionDashboardCoreHandlerClusterFoundationSeizure';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export { useExecutionDashboardCoreHandlerClusterFoundationCore } from './useExecutionDashboardCoreHandlerClusterFoundationCore';
export { useExecutionDashboardCoreHandlerClusterFoundationSeizure } from './useExecutionDashboardCoreHandlerClusterFoundationSeizure';

export function useExecutionDashboardCoreHandlerClusterFoundation(
    c: ExecutionDashboardCoreHandlerClusterInput,
) {
    const core = useExecutionDashboardCoreHandlerClusterFoundationCore(c);
    const seizure = useExecutionDashboardCoreHandlerClusterFoundationSeizure(c, core.pushTimelineEvent);
    return {
        ...core,
        ...seizure,
    };
}
