import {
    collectFullHandlerClusterContext,
    type HandlerClusterContextSpreads,
} from './handlerClusterContextShared';
import { useExecutionDashboardCoreHandlerClusterCoerciveEviction } from './useExecutionDashboardCoreHandlerClusterCoerciveEviction';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';
import {
    handlerBagFingerprint,
    usePublishHandlerClusterWhenFingerprintChanges,
} from './handlerClusterPublishUtils';

export type ExecutionDashboardHandlerClusterCoerciveEvictionBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

function coerciveEvictionClusterFingerprint(cluster: Record<string, unknown>): unknown[] {
    const parts: unknown[] = [];
    for (const key of Object.keys(cluster).sort()) {
        const val = cluster[key];
        if (typeof val === 'function') {
            parts.push(val);
            continue;
        }
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            parts.push(...handlerBagFingerprint(val as Record<string, unknown>));
        }
    }
    return parts;
}

export function ExecutionDashboardHandlerClusterCoerciveEvictionBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterCoerciveEvictionBridgeProps) {
    const cluster = useExecutionDashboardCoreHandlerClusterCoerciveEviction(
        collectFullHandlerClusterContext(input as HandlerClusterContextSpreads),
    ) as Record<string, unknown>;

    usePublishHandlerClusterWhenFingerprintChanges(
        cluster,
        coerciveEvictionClusterFingerprint(cluster),
        onCluster,
    );

    return null;
}
