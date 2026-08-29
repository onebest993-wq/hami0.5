import { asHandlerClusterSpreads, type HandlerClusterBridgeInput } from './handlerClusterContextShared';
import { collectSeizureHeavyHandlerClusterContext } from './collectSeizureHeavyHandlerClusterContext';
import { useExecutionDashboardCoreHandlerClusterFoundationCore } from './useExecutionDashboardCoreHandlerClusterFoundationCore';
import { useExecutionDashboardCoreHandlerClusterSeizureResolution } from './useExecutionDashboardCoreHandlerClusterSeizureResolution';
import {
    handlerBagKeyFingerprint,
    usePublishHandlerClusterWhenFingerprintChanges,
} from './handlerClusterPublishUtils';

export type ExecutionDashboardHandlerClusterSeizureLogResolutionBridgeProps = {
    input: HandlerClusterBridgeInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

function seizureLogResolutionClusterFingerprint(
    cluster: Record<string, unknown>,
    executionId: string | undefined,
): unknown[] {
    const release = cluster.seizureReleaseHandlers as Record<string, unknown> | undefined;
    const thirdParty = cluster.thirdPartyReceiveHandlers as Record<string, unknown> | undefined;
    const mark = cluster.standaloneMarkHandlers as Record<string, unknown> | undefined;
    const salary = cluster.salarySeizurePatch as Record<string, unknown> | undefined;
    return [
        executionId,
        ...handlerBagKeyFingerprint(release),
        ...handlerBagKeyFingerprint(thirdParty),
        ...handlerBagKeyFingerprint(mark),
        ...handlerBagKeyFingerprint(salary),
    ];
}

export function ExecutionDashboardHandlerClusterSeizureLogResolutionBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterSeizureLogResolutionBridgeProps) {
    const resolvedInput = collectSeizureHeavyHandlerClusterContext(asHandlerClusterSpreads(input));
    const executionId = (resolvedInput as { executionId?: string }).executionId;
    const { pushTimelineEvent } = useExecutionDashboardCoreHandlerClusterFoundationCore(resolvedInput);
    const { seizureReleaseHandlers, thirdPartyReceiveHandlers, standaloneMarkHandlers, salarySeizurePatch } =
        useExecutionDashboardCoreHandlerClusterSeizureResolution(resolvedInput, {
            pushTimelineEvent,
        });

    const cluster: Record<string, unknown> = {
        seizureReleaseHandlers,
        thirdPartyReceiveHandlers,
        standaloneMarkHandlers,
        salarySeizurePatch,
    };

    usePublishHandlerClusterWhenFingerprintChanges(
        cluster,
        seizureLogResolutionClusterFingerprint(cluster, executionId),
        onCluster,
    );

    return null;
}
