// @ts-nocheck
import { useEffect } from 'react';
import { useExecutionDashboardCoreHandlerClusterFollowupAdminSpecial } from './useExecutionDashboardCoreHandlerClusterFollowupAdminSpecial';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export type ExecutionDashboardHandlerClusterFollowupAdminSpecialBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterFollowupAdminSpecialBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterFollowupAdminSpecialBridgeProps) {
    const cluster = useExecutionDashboardCoreHandlerClusterFollowupAdminSpecial(input);

    useEffect(() => {
        onCluster(cluster);
    }, [cluster, onCluster]);

    return null;
}
