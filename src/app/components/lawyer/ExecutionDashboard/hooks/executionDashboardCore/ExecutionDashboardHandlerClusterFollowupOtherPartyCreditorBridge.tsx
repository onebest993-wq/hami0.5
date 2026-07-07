import { useEffect } from 'react';
import { useExecutionDashboardCoreHandlerClusterFoundationTimeline } from './useExecutionDashboardCoreHandlerClusterFoundationTimeline';
import type { FollowupOtherPartyHandlerClusterInput } from './followupOtherPartyHandlerClusterInput';
import { useExecutionDashboardOtherPartyCreditorHandlers } from './useExecutionDashboardOtherPartyCreditorHandlers';

export type ExecutionDashboardHandlerClusterFollowupOtherPartyCreditorBridgeProps = {
    input: FollowupOtherPartyHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterFollowupOtherPartyCreditorBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterFollowupOtherPartyCreditorBridgeProps) {
    const { pushTimelineEventBinding, pushTimelineEvent } =
        useExecutionDashboardCoreHandlerClusterFoundationTimeline(input);

    const dossierFollowupHandlers = useExecutionDashboardOtherPartyCreditorHandlers({
        executionDataRef: input.executionDataRef,
        executionId: input.executionId,
        decisionsStorageExecutionId: input.decisionsStorageExecutionId,
        nextTimelineId: input.nextTimelineId,
        pushTimelineEvent,
        showToast: input.showToast,
        openDecisionsModalWithBoot: input.openDecisionsModalWithBoot,
    });

    useEffect(() => {
        onCluster({
            pushTimelineEventBinding,
            pushTimelineEvent,
            dossierFollowupHandlers,
        });
    }, [dossierFollowupHandlers, onCluster, pushTimelineEvent, pushTimelineEventBinding]);

    return null;
}
