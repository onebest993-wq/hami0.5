import { useExecutionDashboardCoreHandlerClusterFoundationTimeline } from './useExecutionDashboardCoreHandlerClusterFoundationTimeline';
import type { FollowupOtherPartyHandlerClusterInput } from './followupOtherPartyHandlerClusterInput';
import { useExecutionDashboardOtherPartyDebtorHandlers } from './useExecutionDashboardOtherPartyDebtorHandlers';
import {
    handlerBagKeyFingerprint,
    usePublishHandlerClusterWhenFingerprintChanges,
} from './handlerClusterPublishUtils';

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

    const cluster = {
        pushTimelineEventBinding,
        pushTimelineEvent,
        dossierFollowupHandlers,
    };

    const pushBinding = pushTimelineEventBinding as Record<string, unknown> | undefined;
    usePublishHandlerClusterWhenFingerprintChanges(
        cluster,
        [
            pushBinding?.pushTimelineEvent,
            pushTimelineEvent,
            ...handlerBagKeyFingerprint(dossierFollowupHandlers as Record<string, unknown>),
        ],
        onCluster,
    );

    return null;
}
