import {
    collectFullHandlerClusterContext,
    type HandlerClusterContextSpreads,
} from './handlerClusterContextShared';
import { useExecutionDashboardEmployeeAssignmentHandlers } from './useExecutionDashboardEmployeeAssignmentHandlers';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';
import {
    handlerBagKeyFingerprint,
    usePublishHandlerClusterWhenFingerprintChanges,
} from './handlerClusterPublishUtils';

export type ExecutionDashboardHandlerClusterEmployeeAssignmentBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterEmployeeAssignmentBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterEmployeeAssignmentBridgeProps) {
    const c = collectFullHandlerClusterContext(input as HandlerClusterContextSpreads) as any;

    const employeeAssignmentHandlers = useExecutionDashboardEmployeeAssignmentHandlers({
        executionData: c.executionData,
        unifiedSummonsTargetDebtorKey: c.unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved: c.primaryDebtorKeyResolved,
        nextTimelineId: c.nextTimelineId,
        persistExecutionMerge: c.persistExecutionMerge,
        showToast: c.showToast,
        setTimelineEvents: c.setTimelineEvents,
        forcedBringDecisionState: c.forcedBringDecisionState,
        employeeForcedBringAwaitingPersonalOutcome: c.employeeForcedBringAwaitingPersonalOutcome,
    });

    const cluster: Record<string, unknown> = { employeeAssignmentHandlers };

    usePublishHandlerClusterWhenFingerprintChanges(
        cluster,
        handlerBagKeyFingerprint(employeeAssignmentHandlers as Record<string, unknown>),
        onCluster,
    );

    return null;
}
