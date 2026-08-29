import {
    collectFullHandlerClusterContext,
    type HandlerClusterContextSpreads,
} from './handlerClusterContextShared';
import { useExecutionDashboardPublicationNoticeHandlers } from './useExecutionDashboardPublicationNoticeHandlers';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';
import {
    handlerBagKeyFingerprint,
    usePublishHandlerClusterWhenFingerprintChanges,
} from './handlerClusterPublishUtils';

export type ExecutionDashboardHandlerClusterPublicationNoticeBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterPublicationNoticeBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterPublicationNoticeBridgeProps) {
    const c = collectFullHandlerClusterContext(input as HandlerClusterContextSpreads);

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
