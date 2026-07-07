import { useEffect } from 'react';
import { useExecutionDashboardCoreHandlerClusterFollowupAdminSpecial } from './useExecutionDashboardCoreHandlerClusterFollowupAdminSpecial';
import type { FollowupAdminSpecialHandlerClusterInput } from './followupAdminSpecialHandlerClusterInput';

export type ExecutionDashboardHandlerClusterFollowupAdminSpecialBridgeProps = {
    input: FollowupAdminSpecialHandlerClusterInput;
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
