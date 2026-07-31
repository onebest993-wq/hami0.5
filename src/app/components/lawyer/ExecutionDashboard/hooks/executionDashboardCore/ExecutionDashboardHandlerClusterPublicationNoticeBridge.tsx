import { useEffect } from 'react';
import {
    collectFullHandlerClusterContext,
    type HandlerClusterContextSpreads,
} from './handlerClusterContextShared';
import { useExecutionDashboardPublicationNoticeHandlers } from './useExecutionDashboardPublicationNoticeHandlers';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export type ExecutionDashboardHandlerClusterPublicationNoticeBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterPublicationNoticeBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterPublicationNoticeBridgeProps) {
    const c = collectFullHandlerClusterContext(input as HandlerClusterContextSpreads) as any;

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

    useEffect(() => {
        onCluster({ publicationNoticeHandlers });
    }, [onCluster, publicationNoticeHandlers]);

    return null;
}
