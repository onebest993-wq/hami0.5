// @ts-nocheck
import { useEffect } from 'react';
import { useExecutionDashboardCoreHandlerClusterFollowupOtherParty } from './useExecutionDashboardCoreHandlerClusterFollowupOtherParty';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export type ExecutionDashboardHandlerClusterFollowupOtherPartyBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterFollowupOtherPartyBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterFollowupOtherPartyBridgeProps) {
    const cluster = useExecutionDashboardCoreHandlerClusterFollowupOtherParty(input);

    useEffect(() => {
        onCluster(cluster);
    }, [cluster, onCluster]);

    return null;
}
