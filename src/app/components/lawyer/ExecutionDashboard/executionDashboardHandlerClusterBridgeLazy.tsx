import { lazy } from 'react';

const executionHandlerClusterBridgeImport = () =>
    import('./hooks/executionDashboardCore/ExecutionDashboardHandlerClusterBridge').then((m) => ({
        default: m.ExecutionDashboardHandlerClusterBridge,
    }));

export const LazyExecutionDashboardHandlerClusterBridge = lazy(executionHandlerClusterBridgeImport);

export function prefetchExecutionHandlerClusterBridge(): void {
    void executionHandlerClusterBridgeImport().catch(() => undefined);
}
