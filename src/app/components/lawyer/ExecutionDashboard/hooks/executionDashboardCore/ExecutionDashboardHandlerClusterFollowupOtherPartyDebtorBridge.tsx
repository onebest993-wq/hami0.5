import { useEffect } from 'react';
import { useExecutionDashboardCoreHandlerClusterFoundationTimeline } from './useExecutionDashboardCoreHandlerClusterFoundationTimeline';
import type { FollowupOtherPartyHandlerClusterInput } from './followupOtherPartyHandlerClusterInput';
import { useExecutionDashboardOtherPartyDebtorHandlers } from './useExecutionDashboardOtherPartyDebtorHandlers';

export type ExecutionDashboardHandlerClusterFollowupOtherPartyDebtorBridgeProps = {
    input: FollowupOtherPartyHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterFollowupOtherPartyDebtorBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterFollowupOtherPartyDebtorBridgeProps) {
    const { pushTimelineEventBinding, pushTimelineEvent } =
        useExecutionDashboardCoreHandlerClusterFoundationTimeline(input);

    const dossierFollowupHandlers = useExecutionDashboardOtherPartyDebtorHandlers({
        executionData: input.executionData,
        timelineEvents: input.timelineEvents,
        nextTimelineId: input.nextTimelineId,
        pushTimelineEvent,
        persistExecutionMerge: input.persistExecutionMerge,
        showToast: input.showToast,
        setTimelineEvents: input.setTimelineEvents,
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
