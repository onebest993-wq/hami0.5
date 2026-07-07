// @ts-nocheck
import { useEffect } from 'react';
import {
    collectSeizureHeavyHandlerClusterContext,
    type HandlerClusterContextSpreads,
} from './collectHandlerClusterContext';
import { useExecutionDashboardCoreHandlerClusterFoundationCore } from './useExecutionDashboardCoreHandlerClusterFoundationCore';
import { useExecutionDashboardCoreHandlerClusterSeizureFollowup } from './useExecutionDashboardCoreHandlerClusterSeizureFollowup';
import { useExecutionDashboardCoreHandlerClusterSeizureCoercive } from './useExecutionDashboardCoreHandlerClusterSeizureCoercive';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export type ExecutionDashboardHandlerClusterSeizureLogBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterSeizureLogBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterSeizureLogBridgeProps) {
    const resolvedInput = collectSeizureHeavyHandlerClusterContext(input as HandlerClusterContextSpreads);
    const foundation = useExecutionDashboardCoreHandlerClusterFoundationCore(resolvedInput);
    const {
        firstActiveAppealDecisionId,
        pushTimelineEventBinding,
        pushTimelineEvent,
        propertyInlineSaveCtx,
    } = foundation;

    const seizureFollowupBlock = useExecutionDashboardCoreHandlerClusterSeizureFollowup(resolvedInput, {
        pushTimelineEvent,
    });
    const {
        focusSeizurePropertyInlineCompletion,
        focusSeizureMovableInlineCompletion,
        focusSeizureThirdPartyInlineCompletion,
        focusSeizureNoticeInlineCompletion,
        seizureAssetModalHandlers,
    } = seizureFollowupBlock;

    const {
        seizureReleaseHandlers,
        thirdPartyReceiveHandlers,
        standaloneMarkHandlers,
        salarySeizurePatch,
    } = useExecutionDashboardCoreHandlerClusterSeizureCoercive(resolvedInput, {
        pushTimelineEvent,
        focusSeizurePropertyInlineCompletion,
        focusSeizureMovableInlineCompletion,
        focusSeizureThirdPartyInlineCompletion,
        focusSeizureNoticeInlineCompletion,
    });

    useEffect(() => {
        onCluster({
            firstActiveAppealDecisionId,
            pushTimelineEventBinding,
            pushTimelineEvent,
            propertyInlineSaveCtx,
            seizureAssetModalHandlers,
            focusSeizurePropertyInlineCompletion,
            focusSeizureMovableInlineCompletion,
            focusSeizureThirdPartyInlineCompletion,
            focusSeizureNoticeInlineCompletion,
            seizureReleaseHandlers,
            thirdPartyReceiveHandlers,
            standaloneMarkHandlers,
            salarySeizurePatch,
        });
    }, [
        firstActiveAppealDecisionId,
        focusSeizureMovableInlineCompletion,
        focusSeizureNoticeInlineCompletion,
        focusSeizurePropertyInlineCompletion,
        focusSeizureThirdPartyInlineCompletion,
        onCluster,
        propertyInlineSaveCtx,
        pushTimelineEvent,
        pushTimelineEventBinding,
        salarySeizurePatch,
        seizureAssetModalHandlers,
        seizureReleaseHandlers,
        standaloneMarkHandlers,
        thirdPartyReceiveHandlers,
    ]);

    return null;
}
