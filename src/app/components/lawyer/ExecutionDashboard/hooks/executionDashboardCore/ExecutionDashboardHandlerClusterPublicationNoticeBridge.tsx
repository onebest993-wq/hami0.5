import { asHandlerClusterSpreads, collectFullHandlerClusterContext, type HandlerClusterBridgeInput } from './handlerClusterContextShared';
import { useExecutionDashboardPublicationNoticeHandlers } from './useExecutionDashboardPublicationNoticeHandlers';
import {
    handlerBagKeyFingerprint,
    usePublishHandlerClusterWhenFingerprintChanges,
} from './handlerClusterPublishUtils';

export type ExecutionDashboardHandlerClusterPublicationNoticeBridgeProps = {
    input: HandlerClusterBridgeInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterPublicationNoticeBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterPublicationNoticeBridgeProps) {
    const c = collectFullHandlerClusterContext(asHandlerClusterSpreads(input));

    const publicationNoticeHandlers = useExecutionDashboardPublicationNoticeHandlers({
        executionActionsGridLocked: c.executionActionsGridLocked,
        executionData: c.executionData,
        unifiedSummonsTargetDebtorKey: c.unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved: c.primaryDebtorKeyResolved,
        nextTimelineId: c.nextTimelineId,
        persistExecutionMerge: c.persistExecutionMerge,
        showToast: c.showToast,
        setTimelineEvents: c.setTimelineEvents,
    });

    const cluster = { publicationNoticeHandlers };

    usePublishHandlerClusterWhenFingerprintChanges(
        cluster,
        handlerBagKeyFingerprint(publicationNoticeHandlers as Record<string, unknown>),
        onCluster,
    );

    return null;
}
