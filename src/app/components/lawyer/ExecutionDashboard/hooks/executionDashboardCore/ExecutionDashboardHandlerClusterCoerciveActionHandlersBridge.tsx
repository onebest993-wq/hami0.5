import { useEffect } from 'react';
import {
    collectFullHandlerClusterContext,
    type HandlerClusterContextSpreads,
} from './handlerClusterContextShared';
import { useExecutionDashboardCoreHandlerClusterCoerciveActionBridge } from './useExecutionDashboardCoreHandlerClusterCoerciveActionBridge';
import { useExecutionDashboardCoreHandlerClusterCoerciveActionHandlers } from './useExecutionDashboardCoreHandlerClusterCoerciveActionHandlers';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export type ExecutionDashboardHandlerClusterCoerciveActionHandlersBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterCoerciveActionHandlersBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterCoerciveActionHandlersBridgeProps) {
    const resolvedInput = collectFullHandlerClusterContext(input as HandlerClusterContextSpreads);
    const coerciveActionBridge = useExecutionDashboardCoreHandlerClusterCoerciveActionBridge(resolvedInput);
    const { saveCoerciveAction } = coerciveActionBridge;
    const coerciveActionHandlers = useExecutionDashboardCoreHandlerClusterCoerciveActionHandlers(
        resolvedInput,
        saveCoerciveAction,
    );

    useEffect(() => {
        onCluster({
            coerciveActionBridge,
            coerciveActionHandlers,
        });
    }, [coerciveActionBridge, coerciveActionHandlers, onCluster]);

    return null;
}
