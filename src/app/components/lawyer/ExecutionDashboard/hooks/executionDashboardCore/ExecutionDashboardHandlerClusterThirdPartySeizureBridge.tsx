import { useEffect } from 'react';
import type { HandlerClusterContextSpreads } from './handlerClusterContextShared';
import { collectThirdPartySeizureHandlerClusterContext } from './collectThirdPartySeizureHandlerClusterContext';
import { useExecutionDashboardCoreHandlerClusterFoundationTimeline } from './useExecutionDashboardCoreHandlerClusterFoundationTimeline';
import { useExecutionDashboardCoreHandlerClusterFoundationSeizureThirdParty } from './useExecutionDashboardCoreHandlerClusterFoundationSeizureThirdParty';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export type ExecutionDashboardHandlerClusterThirdPartySeizureBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterThirdPartySeizureBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterThirdPartySeizureBridgeProps) {
    const resolvedInput = collectThirdPartySeizureHandlerClusterContext(
        input as HandlerClusterContextSpreads,
    );
    const { pushTimelineEventBinding, pushTimelineEvent } =
        useExecutionDashboardCoreHandlerClusterFoundationTimeline(resolvedInput);
    const thirdPartySeizureHandlers = useExecutionDashboardCoreHandlerClusterFoundationSeizureThirdParty(
        resolvedInput,
        pushTimelineEvent,
    );

    useEffect(() => {
        onCluster({
            pushTimelineEventBinding,
            pushTimelineEvent,
            thirdPartySeizureHandlers,
        });
    }, [onCluster, pushTimelineEvent, pushTimelineEventBinding, thirdPartySeizureHandlers]);

    return null;
}
