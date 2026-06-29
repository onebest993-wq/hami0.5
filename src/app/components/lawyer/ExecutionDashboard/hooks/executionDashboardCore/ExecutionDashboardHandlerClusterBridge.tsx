// @ts-nocheck
/** Loads execution-core-handlers — mounted on first dossier interaction only. */
import { useLayoutEffect, useRef } from 'react';
import { useExecutionDashboardCoreHandlerCluster } from './useExecutionDashboardCoreHandlerCluster';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export type ExecutionDashboardHandlerClusterBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    mountKey: string;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterBridge({
    input,
    mountKey,
    onCluster,
}: ExecutionDashboardHandlerClusterBridgeProps) {
    const cluster = useExecutionDashboardCoreHandlerCluster(input);
    const clusterRef = useRef(cluster);
    clusterRef.current = cluster;

    useLayoutEffect(() => {
        onCluster(clusterRef.current);
    }, [mountKey, onCluster]);

    return null;
}
