import { useExecutionDashboardCoreHandlerClusterFollowupOtherParty } from './useExecutionDashboardCoreHandlerClusterFollowupOtherParty';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';import {
    handlerBagKeyFingerprint,
    usePublishHandlerClusterWhenFingerprintChanges,
} from './handlerClusterPublishUtils';

export type ExecutionDashboardHandlerClusterFollowupOtherPartyBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterFollowupOtherPartyBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterFollowupOtherPartyBridgeProps) {
    const cluster = useExecutionDashboardCoreHandlerClusterFollowupOtherParty(input);

    const pushBinding = cluster.pushTimelineEventBinding as Record<string, unknown> | undefined;
    usePublishHandlerClusterWhenFingerprintChanges(
        cluster as Record<string, unknown>,
        [
            pushBinding?.pushTimelineEvent,
            cluster.pushTimelineEvent,
            ...handlerBagKeyFingerprint(cluster.dossierFollowupHandlers as Record<string, unknown>),
        ],
        onCluster,
    );

    return null;
}
