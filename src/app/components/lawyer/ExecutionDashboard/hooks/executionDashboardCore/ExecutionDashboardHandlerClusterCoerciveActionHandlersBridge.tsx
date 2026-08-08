import {
    collectFullHandlerClusterContext,
    type HandlerClusterContextSpreads,
} from './handlerClusterContextShared';
import { useExecutionDashboardCoreHandlerClusterCoerciveActionBridge } from './useExecutionDashboardCoreHandlerClusterCoerciveActionBridge';
import { useExecutionDashboardCoreHandlerClusterCoerciveActionHandlers } from './useExecutionDashboardCoreHandlerClusterCoerciveActionHandlers';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';
import {
    handlerBagKeyFingerprint,
    usePublishHandlerClusterWhenFingerprintChanges,
} from './handlerClusterPublishUtils';

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

    const cluster: Record<string, unknown> = {
        coerciveActionBridge,
        coerciveActionHandlers,
    };

    usePublishHandlerClusterWhenFingerprintChanges(
        cluster,
        [
            ...handlerBagKeyFingerprint(coerciveActionBridge as Record<string, unknown>),
            ...handlerBagKeyFingerprint(coerciveActionHandlers as Record<string, unknown>),
        ],
        onCluster,
    );

    return null;
}
