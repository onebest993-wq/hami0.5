import { asHandlerClusterSpreads, type HandlerClusterBridgeInput } from './handlerClusterContextShared';
import { collectThirdPartySeizureHandlerClusterContext } from './collectThirdPartySeizureHandlerClusterContext';
import { useExecutionDashboardCoreHandlerClusterFoundationTimeline } from './useExecutionDashboardCoreHandlerClusterFoundationTimeline';
import { useExecutionDashboardCoreHandlerClusterFoundationSeizureThirdParty } from './useExecutionDashboardCoreHandlerClusterFoundationSeizureThirdParty';
import {
    handlerBagKeyFingerprint,
    usePublishHandlerClusterWhenFingerprintChanges,
} from './handlerClusterPublishUtils';

export type ExecutionDashboardHandlerClusterThirdPartySeizureBridgeProps = {
    input: HandlerClusterBridgeInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

function thirdPartySeizureClusterFingerprint(
    cluster: Record<string, unknown>,
    executionId: string | undefined,
): unknown[] {
    const push = cluster.pushTimelineEventBinding as Record<string, unknown> | undefined;
    const handlers = cluster.thirdPartySeizureHandlers as Record<string, unknown> | undefined;
    return [
        executionId,
        push?.pushTimelineEvent,
        cluster.pushTimelineEvent,
        ...handlerBagKeyFingerprint(handlers),
    ];
}

export function ExecutionDashboardHandlerClusterThirdPartySeizureBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterThirdPartySeizureBridgeProps) {
    const resolvedInput = collectThirdPartySeizureHandlerClusterContext(
        asHandlerClusterSpreads(input),
    );
    const executionId = (resolvedInput as { executionId?: string }).executionId;
    const { pushTimelineEventBinding, pushTimelineEvent } =
        useExecutionDashboardCoreHandlerClusterFoundationTimeline(resolvedInput);
    const thirdPartySeizureHandlers = useExecutionDashboardCoreHandlerClusterFoundationSeizureThirdParty(
        resolvedInput,
        pushTimelineEvent,
    );

    const cluster: Record<string, unknown> = {
        pushTimelineEventBinding,
        pushTimelineEvent,
        thirdPartySeizureHandlers,
    };

    usePublishHandlerClusterWhenFingerprintChanges(
        cluster,
        thirdPartySeizureClusterFingerprint(cluster, executionId),
        onCluster,
    );

    return null;
}
