import { lazy } from 'react';

const executionShellOverlaysImport = () =>
    import('./components/ExecutionDashboardShellOverlays').then((m) => ({
        default: m.ExecutionDashboardShellOverlays,
    }));

export const LazyExecutionDashboardShellOverlays = lazy(executionShellOverlaysImport);

export function prefetchExecutionDashboardShellOverlays(): void {
    void executionShellOverlaysImport().catch(() => undefined);
}
