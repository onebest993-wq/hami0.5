import React, { Suspense, lazy } from 'react';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export type ExecutionDashboardHandlerClusterCoerciveLifecycleBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

const LazyExecutionDashboardHandlerClusterCoerciveFoundationBridge = lazy(() =>
    import('./ExecutionDashboardHandlerClusterCoerciveFoundationBridge').then((m) => ({
        default: m.ExecutionDashboardHandlerClusterCoerciveFoundationBridge,
    })),
);

const LazyExecutionDashboardHandlerClusterCoerciveStayBridge = lazy(() =>
    import('./ExecutionDashboardHandlerClusterCoerciveStayBridge').then((m) => ({
        default: m.ExecutionDashboardHandlerClusterCoerciveStayBridge,
    })),
);

const LazyExecutionDashboardHandlerClusterCoercivePartyLifecycleBridge = lazy(() =>
    import('./ExecutionDashboardHandlerClusterCoercivePartyLifecycleBridge').then((m) => ({
        default: m.ExecutionDashboardHandlerClusterCoercivePartyLifecycleBridge,
    })),
);

export function ExecutionDashboardHandlerClusterCoerciveLifecycleBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterCoerciveLifecycleBridgeProps) {
    return (
        <>
            <Suspense fallback={null}>
                <LazyExecutionDashboardHandlerClusterCoerciveFoundationBridge
                    input={input}
                    onCluster={onCluster}
                />
            </Suspense>
            <Suspense fallback={null}>
                <LazyExecutionDashboardHandlerClusterCoerciveStayBridge
                    input={input}
                    onCluster={onCluster}
                />
            </Suspense>
            <Suspense fallback={null}>
                <LazyExecutionDashboardHandlerClusterCoercivePartyLifecycleBridge
                    input={input}
                    onCluster={onCluster}
                />
            </Suspense>
        </>
    );
}
