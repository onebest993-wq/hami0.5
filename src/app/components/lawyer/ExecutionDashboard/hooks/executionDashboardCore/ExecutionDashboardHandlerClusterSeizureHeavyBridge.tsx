// @ts-nocheck
import { useEffect } from 'react';
import {
    collectSeizureHeavyHandlerClusterContext,
    type HandlerClusterContextSpreads,
} from './collectHandlerClusterContext';
import { useExecutionDashboardCoreHandlerClusterSeizureHeavy } from './useExecutionDashboardCoreHandlerClusterSeizureHeavy';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export type ExecutionDashboardHandlerClusterSeizureHeavyBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterSeizureHeavyBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterSeizureHeavyBridgeProps) {
    const cluster = useExecutionDashboardCoreHandlerClusterSeizureHeavy(
        collectSeizureHeavyHandlerClusterContext(input as HandlerClusterContextSpreads),
    );

    useEffect(() => {
        onCluster(cluster);
    }, [cluster, onCluster]);

    return null;
}
