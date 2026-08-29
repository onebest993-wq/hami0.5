import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';
import { useExecutionDashboardCoreHandlerClusterLight } from './useExecutionDashboardCoreHandlerClusterLight';
import {
    handlerBagKeyFingerprint,
    usePublishHandlerClusterWhenFingerprintChanges,
} from './handlerClusterPublishUtils';

/** Loads execution-core-handlers-light for notes/appointment/payment paths only. */
export type ExecutionDashboardHandlerClusterLightBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterLightBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterLightBridgeProps) {
    const cluster = useExecutionDashboardCoreHandlerClusterLight(input);

    usePublishHandlerClusterWhenFingerprintChanges(
        cluster as Record<string, unknown>,
        [
            ...handlerBagKeyFingerprint(
                cluster.notesTasksHandlers as Record<string, unknown> | undefined,
            ),
            ...handlerBagKeyFingerprint(
                cluster.appointmentHandler as Record<string, unknown> | undefined,
            ),
            ...handlerBagKeyFingerprint(
                cluster.paymentHandlers as Record<string, unknown> | undefined,
            ),
            ...handlerBagKeyFingerprint(
                cluster.pushTimelineEventBinding as Record<string, unknown> | undefined,
            ),
        ],
        onCluster,
    );

    return null;
}
