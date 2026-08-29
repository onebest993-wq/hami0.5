import { asHandlerClusterSpreads, type HandlerClusterBridgeInput } from './handlerClusterContextShared';
import { collectSeizureHeavyHandlerClusterContext } from './collectSeizureHeavyHandlerClusterContext';
import { useExecutionDashboardCoreHandlerClusterSeizureHeavy } from './useExecutionDashboardCoreHandlerClusterSeizureHeavy';
import {
    handlerBagKeyFingerprint,
    usePublishHandlerClusterWhenFingerprintChanges,
} from './handlerClusterPublishUtils';

export type ExecutionDashboardHandlerClusterSeizureHeavyBridgeProps = {
    input: HandlerClusterBridgeInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

function seizureHeavyClusterFingerprint(
    cluster: Record<string, unknown>,
    executionId: string | undefined,
): unknown[] {
    const push = cluster.pushTimelineEventBinding as Record<string, unknown> | undefined;
    const propertyCtx = cluster.propertyInlineSaveCtx as Record<string, unknown> | undefined;
    const movableCtx = cluster.movableInlineSaveCtx as Record<string, unknown> | undefined;
    const followup = cluster.followupSeizureHandlers as Record<string, unknown> | undefined;
    const release = cluster.seizureReleaseHandlers as Record<string, unknown> | undefined;
    const thirdParty = cluster.thirdPartyReceiveHandlers as Record<string, unknown> | undefined;
    const mark = cluster.standaloneMarkHandlers as Record<string, unknown> | undefined;
    const salary = cluster.salarySeizurePatch as Record<string, unknown> | undefined;
    const realEstate = cluster.realEstateSeizureHandlers as Record<string, unknown> | undefined;
    const thirdPartyRegistry = cluster.thirdPartySeizureHandlers as Record<string, unknown> | undefined;
    return [
        executionId,
        cluster.firstActiveAppealDecisionId,
        cluster.removeJudicialCustodianEntry,
        ...handlerBagKeyFingerprint(push),
        ...handlerBagKeyFingerprint(propertyCtx),
        ...handlerBagKeyFingerprint(movableCtx),
        ...handlerBagKeyFingerprint(followup),
        ...handlerBagKeyFingerprint(release),
        ...handlerBagKeyFingerprint(thirdParty),
        ...handlerBagKeyFingerprint(mark),
        ...handlerBagKeyFingerprint(salary),
        ...handlerBagKeyFingerprint(realEstate),
        ...handlerBagKeyFingerprint(thirdPartyRegistry),
    ];
}

export function ExecutionDashboardHandlerClusterSeizureHeavyBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterSeizureHeavyBridgeProps) {
    const resolvedInput = collectSeizureHeavyHandlerClusterContext(asHandlerClusterSpreads(input));
    const executionId = (resolvedInput as { executionId?: string }).executionId;
    const cluster = useExecutionDashboardCoreHandlerClusterSeizureHeavy(
        resolvedInput,
    ) as Record<string, unknown>;

    usePublishHandlerClusterWhenFingerprintChanges(
        cluster,
        seizureHeavyClusterFingerprint(cluster, executionId),
        onCluster,
    );

    return null;
}
