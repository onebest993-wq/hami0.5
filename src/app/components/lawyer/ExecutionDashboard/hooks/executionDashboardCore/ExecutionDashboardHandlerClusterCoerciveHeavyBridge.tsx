// @ts-nocheck
import { useEffect } from 'react';
import {
    collectHandlerClusterContext,
    type HandlerClusterContextSpreads,
} from './collectHandlerClusterContext';
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
    const cluster = useExecutionDashboardCoreHandlerClusterCoerciveHeavy(
        collectHandlerClusterContext(input as HandlerClusterContextSpreads),
    );

    useEffect(() => {
        onCluster(cluster);
    }, [cluster, onCluster]);

    return null;
}
