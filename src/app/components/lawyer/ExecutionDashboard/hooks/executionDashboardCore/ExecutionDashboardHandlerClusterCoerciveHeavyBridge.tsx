// @ts-nocheck
import { useEffect } from 'react';
import { useExecutionDashboardCoreHandlerClusterCoerciveHeavy } from './useExecutionDashboardCoreHandlerClusterCoerciveHeavy';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export type ExecutionDashboardHandlerClusterCoerciveHeavyBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterCoerciveHeavyBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterCoerciveHeavyBridgeProps) {
    const cluster = useExecutionDashboardCoreHandlerClusterCoerciveHeavy(input);

    useEffect(() => {
        onCluster(cluster);
    }, [cluster, onCluster]);

    return null;
}
