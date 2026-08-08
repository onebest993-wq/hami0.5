import { useExecutionDashboardCoreHandlerClusterFollowupAdminSpecial } from './useExecutionDashboardCoreHandlerClusterFollowupAdminSpecial';
import type { FollowupAdminSpecialHandlerClusterInput } from './followupAdminSpecialHandlerClusterInput';
import {
    handlerBagKeyFingerprint,
    usePublishHandlerClusterWhenFingerprintChanges,
} from './handlerClusterPublishUtils';

export type ExecutionDashboardHandlerClusterFollowupAdminSpecialBridgeProps = {
    input: FollowupAdminSpecialHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterFollowupAdminSpecialBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterFollowupAdminSpecialBridgeProps) {
    const cluster = useExecutionDashboardCoreHandlerClusterFollowupAdminSpecial(input);

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
