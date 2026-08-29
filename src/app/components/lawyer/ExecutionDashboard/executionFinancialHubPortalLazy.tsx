import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { ExecutionFinancialHubPortalProps } from './components/executionFinancialHub/ExecutionFinancialHubPortalProps';

export const LazyExecutionFinancialHubPortal =
    createPreloadableLazyComponent<ExecutionFinancialHubPortalProps>(() =>
        import('./components/ExecutionFinancialHubPortal').then((m) => ({
            default: m.ExecutionFinancialHubPortal,
        })),
    );

export function prefetchExecutionFinancialHubPortal(): void {
    void LazyExecutionFinancialHubPortal.preload();
    void import('./executionFinancialOperationsCenterLazy')
        .then((m) => {
            m.prefetchFinancialOperationsCenter();
        })
        .catch(() => undefined);
}
