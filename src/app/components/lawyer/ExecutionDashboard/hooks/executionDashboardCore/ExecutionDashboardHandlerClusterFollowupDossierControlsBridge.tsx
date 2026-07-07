// @ts-nocheck
import { useEffect } from 'react';
import {
    collectFollowupDossierControlsHandlerClusterContext,
    type HandlerClusterContextSpreads,
} from './collectHandlerClusterContext';
import { useExecutionDashboardCoreHandlerClusterFollowupDossierControls } from './useExecutionDashboardCoreHandlerClusterFollowupDossierControls';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export type ExecutionDashboardHandlerClusterFollowupDossierControlsBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterFollowupDossierControlsBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterFollowupDossierControlsBridgeProps) {
    const cluster = useExecutionDashboardCoreHandlerClusterFollowupDossierControls(
        collectFollowupDossierControlsHandlerClusterContext(input as HandlerClusterContextSpreads),
    );

    useEffect(() => {
        onCluster(cluster);
    }, [cluster, onCluster]);

    return null;
}
