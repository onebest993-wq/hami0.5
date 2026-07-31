import { useEffect } from 'react';
import {
    handlerClusterSourceBags,
    pickHandlerClusterKeys,
    type HandlerClusterContextSpreads,
} from './handlerClusterContextShared';
import { useExecutionDashboardStayHandlers } from './useExecutionDashboardStayHandlers';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

type StayHandlersInput = Parameters<typeof useExecutionDashboardStayHandlers>[0];

type Props = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

const STAY_HANDLER_CLUSTER_KEYS = [
    'currentFileId',
    'executionData',
    'file',
    'nextTimelineId',
    'persistExecutionMerge',
    'setCaseTasksPending',
    'setExecutionPaused',
    'setTimelineEvents',
    'showToast',
] as const;

export function ExecutionDashboardHandlerClusterCoerciveStayBridge({
    input,
    onCluster,
}: Props) {
    const c = pickHandlerClusterKeys(
        handlerClusterSourceBags(input as HandlerClusterContextSpreads),
        STAY_HANDLER_CLUSTER_KEYS,
    ) as StayHandlersInput;

    const stayHandlers = useExecutionDashboardStayHandlers({
        executionData: c.executionData,
        file: c.file,
        currentFileId: c.currentFileId,
        nextTimelineId: c.nextTimelineId,
        persistExecutionMerge: c.persistExecutionMerge,
        showToast: c.showToast,
        setTimelineEvents: c.setTimelineEvents,
        setCaseTasksPending: c.setCaseTasksPending,
        setExecutionPaused: c.setExecutionPaused,
    });

    useEffect(() => {
        onCluster({ stayHandlers });
    }, [onCluster, stayHandlers]);

    return null;
}
