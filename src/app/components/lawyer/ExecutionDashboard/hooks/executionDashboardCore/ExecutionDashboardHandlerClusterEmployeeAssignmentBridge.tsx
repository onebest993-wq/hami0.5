import { asHandlerClusterSpreads, collectFullHandlerClusterContext, type HandlerClusterBridgeInput } from './handlerClusterContextShared';
import { useExecutionDashboardEmployeeAssignmentHandlers } from './useExecutionDashboardEmployeeAssignmentHandlers';
import {
    handlerBagKeyFingerprint,
    usePublishHandlerClusterWhenFingerprintChanges,
} from './handlerClusterPublishUtils';

export type ExecutionDashboardHandlerClusterEmployeeAssignmentBridgeProps = {
    input: HandlerClusterBridgeInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterEmployeeAssignmentBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterEmployeeAssignmentBridgeProps) {
    const c = collectFullHandlerClusterContext(asHandlerClusterSpreads(input));

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
