import { useEffect } from 'react';
import {
    collectFullHandlerClusterContext,
    type HandlerClusterContextSpreads,
} from './handlerClusterContextShared';
import { useExecutionDashboardCoreHandlerClusterCoerciveEviction } from './useExecutionDashboardCoreHandlerClusterCoerciveEviction';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export type ExecutionDashboardHandlerClusterCoerciveEvictionBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterCoerciveEvictionBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterCoerciveEvictionBridgeProps) {
    const cluster = useExecutionDashboardCoreHandlerClusterCoerciveEviction(
        collectFullHandlerClusterContext(input as HandlerClusterContextSpreads),
    );

    useEffect(() => {
        onCluster(cluster);
    }, [cluster, onCluster]);

    return null;
}
