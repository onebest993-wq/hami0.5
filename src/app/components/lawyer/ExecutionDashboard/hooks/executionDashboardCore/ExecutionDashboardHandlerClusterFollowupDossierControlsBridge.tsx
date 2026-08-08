// @ts-nocheck
import {
    collectFollowupDossierControlsHandlerClusterContext,
    type HandlerClusterContextSpreads,
} from './collectHandlerClusterContext';
import { useExecutionDashboardCoreHandlerClusterFollowupDossierControls } from './useExecutionDashboardCoreHandlerClusterFollowupDossierControls';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';
import {
    handlerBagKeyFingerprint,
    usePublishHandlerClusterWhenFingerprintChanges,
} from './handlerClusterPublishUtils';

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

    usePublishHandlerClusterWhenFingerprintChanges(
        cluster as Record<string, unknown>,
        [
            ...handlerBagKeyFingerprint(
                cluster.dossierFollowupHandlers as Record<string, unknown>,
            ),
        ],
        onCluster,
    );

    return null;
}
