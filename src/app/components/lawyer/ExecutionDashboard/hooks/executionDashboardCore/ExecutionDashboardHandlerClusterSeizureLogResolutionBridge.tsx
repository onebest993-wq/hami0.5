import { useEffect } from 'react';
import { collectSeizureHeavyHandlerClusterContext } from './collectSeizureHeavyHandlerClusterContext';
import type { HandlerClusterContextSpreads } from './handlerClusterContextShared';
import { useExecutionDashboardCoreHandlerClusterFoundationCore } from './useExecutionDashboardCoreHandlerClusterFoundationCore';
import { useExecutionDashboardCoreHandlerClusterSeizureResolution } from './useExecutionDashboardCoreHandlerClusterSeizureResolution';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export type ExecutionDashboardHandlerClusterSeizureLogResolutionBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterSeizureLogResolutionBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterSeizureLogResolutionBridgeProps) {
    const resolvedInput = collectSeizureHeavyHandlerClusterContext(input as HandlerClusterContextSpreads);
    const { pushTimelineEvent } = useExecutionDashboardCoreHandlerClusterFoundationCore(resolvedInput);
    const { seizureReleaseHandlers, thirdPartyReceiveHandlers, standaloneMarkHandlers, salarySeizurePatch } =
        useExecutionDashboardCoreHandlerClusterSeizureResolution(resolvedInput, {
            pushTimelineEvent,
        });

    useEffect(() => {
        onCluster({
            seizureReleaseHandlers,
            thirdPartyReceiveHandlers,
            standaloneMarkHandlers,
            salarySeizurePatch,
        });
    }, [
        onCluster,
        salarySeizurePatch,
        seizureReleaseHandlers,
        standaloneMarkHandlers,
        thirdPartyReceiveHandlers,
    ]);

    return null;
}
