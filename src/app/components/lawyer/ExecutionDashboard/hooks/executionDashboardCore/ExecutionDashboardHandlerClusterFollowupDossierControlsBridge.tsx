import { asHandlerClusterSpreads, type HandlerClusterBridgeInput } from './handlerClusterContextShared';
import { collectFollowupDossierControlsHandlerClusterContext } from './collectHandlerClusterContext';
import { useExecutionDashboardCoreHandlerClusterFollowupDossierControls } from './useExecutionDashboardCoreHandlerClusterFollowupDossierControls';
import {
    handlerBagKeyFingerprint,
    usePublishHandlerClusterWhenFingerprintChanges,
} from './handlerClusterPublishUtils';

export type ExecutionDashboardHandlerClusterFollowupDossierControlsBridgeProps = {
    input: HandlerClusterBridgeInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterFollowupDossierControlsBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterFollowupDossierControlsBridgeProps) {
    const cluster = useExecutionDashboardCoreHandlerClusterFollowupDossierControls(
        collectFollowupDossierControlsHandlerClusterContext(asHandlerClusterSpreads(input)),
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
