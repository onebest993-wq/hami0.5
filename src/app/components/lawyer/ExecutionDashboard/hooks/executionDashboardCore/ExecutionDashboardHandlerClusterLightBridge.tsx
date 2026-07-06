// @ts-nocheck
/** Loads execution-core-handlers-light for notes/appointment/payment paths only. */
import { useEffect } from 'react';
import { useExecutionDashboardCoreHandlerClusterLight } from './useExecutionDashboardCoreHandlerClusterLight';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export type ExecutionDashboardHandlerClusterLightBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterLightBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterLightBridgeProps) {
    const cluster = useExecutionDashboardCoreHandlerClusterLight(input);

    useEffect(() => {
        onCluster(cluster);
    }, [cluster, onCluster]);

    return null;
}
