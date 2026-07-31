import { useEffect } from 'react';
import { collectSeizureHeavyHandlerClusterContext } from './collectSeizureHeavyHandlerClusterContext';
import type { HandlerClusterContextSpreads } from './handlerClusterContextShared';
import { useExecutionDashboardCoreHandlerClusterFoundationCore } from './useExecutionDashboardCoreHandlerClusterFoundationCore';
import { useExecutionDashboardCoreHandlerClusterSeizureAssetModal } from './useExecutionDashboardCoreHandlerClusterSeizureAssetModal';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export type ExecutionDashboardHandlerClusterSeizureLogAssetModalBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterSeizureLogAssetModalBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterSeizureLogAssetModalBridgeProps) {
    const resolvedInput = collectSeizureHeavyHandlerClusterContext(input as HandlerClusterContextSpreads);
    const foundation = useExecutionDashboardCoreHandlerClusterFoundationCore(resolvedInput);
    const { pushTimelineEventBinding, pushTimelineEvent } = foundation;

    const seizureFollowupBlock = useExecutionDashboardCoreHandlerClusterSeizureAssetModal(resolvedInput, {
        pushTimelineEvent,
    });
    const {
        focusSeizurePropertyInlineCompletion,
        focusSeizureMovableInlineCompletion,
        focusSeizureThirdPartyInlineCompletion,
        focusSeizureNoticeInlineCompletion,
        seizureAssetModalHandlers,
    } = seizureFollowupBlock;

    useEffect(() => {
        onCluster({
            pushTimelineEventBinding,
            pushTimelineEvent,
            seizureAssetModalHandlers,
            focusSeizurePropertyInlineCompletion,
            focusSeizureMovableInlineCompletion,
            focusSeizureThirdPartyInlineCompletion,
            focusSeizureNoticeInlineCompletion,
        });
    }, [
        focusSeizureMovableInlineCompletion,
        focusSeizureNoticeInlineCompletion,
        focusSeizurePropertyInlineCompletion,
        focusSeizureThirdPartyInlineCompletion,
        onCluster,
        pushTimelineEvent,
        pushTimelineEventBinding,
        seizureAssetModalHandlers,
    ]);

    return null;
}
