// @ts-nocheck
import { useEffect } from 'react';
import {
    collectFollowupOtherPartyHandlerClusterContext,
    type HandlerClusterContextSpreads,
} from './collectHandlerClusterContext';
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
    const cluster = useExecutionDashboardCoreHandlerClusterFollowupOtherParty(
        collectFollowupOtherPartyHandlerClusterContext(input as HandlerClusterContextSpreads),
    );

    useEffect(() => {
        onCluster(cluster);
    }, [cluster, onCluster]);

    return null;
}
