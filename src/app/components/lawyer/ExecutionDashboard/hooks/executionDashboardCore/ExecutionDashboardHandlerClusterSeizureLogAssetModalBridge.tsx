import { asHandlerClusterSpreads, type HandlerClusterBridgeInput } from './handlerClusterContextShared';
import { collectSeizureHeavyHandlerClusterContext } from './collectSeizureHeavyHandlerClusterContext';
import { useExecutionDashboardCoreHandlerClusterFoundationCore } from './useExecutionDashboardCoreHandlerClusterFoundationCore';
import { useExecutionDashboardCoreHandlerClusterSeizureAssetModal } from './useExecutionDashboardCoreHandlerClusterSeizureAssetModal';
import { useExecutionDashboardCoreHandlerClusterSeizureFollowupRequests } from './useExecutionDashboardCoreHandlerClusterSeizureFollowupRequests';
import {
    handlerBagKeyFingerprint,
    usePublishHandlerClusterWhenFingerprintChanges,
} from './handlerClusterPublishUtils';

export type ExecutionDashboardHandlerClusterSeizureLogAssetModalBridgeProps = {
    input: HandlerClusterBridgeInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

function seizureLogAssetModalClusterFingerprint(
    cluster: Record<string, unknown>,
    executionId: string | undefined,
): unknown[] {
    const push = cluster.pushTimelineEventBinding as Record<string, unknown> | undefined;
    const followup = cluster.followupSeizureHandlers as Record<string, unknown> | undefined;
    const asset = cluster.seizureAssetModalHandlers as Record<string, unknown> | undefined;
    return [
        executionId,
        push?.pushTimelineEvent,
        cluster.pushTimelineEvent,
        ...handlerBagKeyFingerprint(followup),
        ...handlerBagKeyFingerprint(asset),
    ];
}

export function ExecutionDashboardHandlerClusterSeizureLogAssetModalBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterSeizureLogAssetModalBridgeProps) {
    const resolvedInput = collectSeizureHeavyHandlerClusterContext(asHandlerClusterSpreads(input));
    const executionId = (resolvedInput as { executionId?: string }).executionId;
    const foundation = useExecutionDashboardCoreHandlerClusterFoundationCore(resolvedInput);
    const { pushTimelineEventBinding, pushTimelineEvent } = foundation;

    const seizureFollowupBlock = useExecutionDashboardCoreHandlerClusterSeizureAssetModal(resolvedInput, {
        pushTimelineEvent,
    });
    const { followupSeizureHandlers } = useExecutionDashboardCoreHandlerClusterSeizureFollowupRequests(
        resolvedInput,
        { pushTimelineEvent },
    );
    const {
        focusSeizurePropertyInlineCompletion,
        focusSeizureMovableInlineCompletion,
        focusSeizureThirdPartyInlineCompletion,
        focusSeizureNoticeInlineCompletion,
        seizureAssetModalHandlers,
    } = seizureFollowupBlock;

    const cluster: Record<string, unknown> = {
        pushTimelineEventBinding,
        pushTimelineEvent,
        followupSeizureHandlers,
        seizureAssetModalHandlers,
        focusSeizurePropertyInlineCompletion,
        focusSeizureMovableInlineCompletion,
        focusSeizureThirdPartyInlineCompletion,
        focusSeizureNoticeInlineCompletion,
    };

    usePublishHandlerClusterWhenFingerprintChanges(
        cluster,
        seizureLogAssetModalClusterFingerprint(cluster, executionId),
        onCluster,
    );

    return null;
}
