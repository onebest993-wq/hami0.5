import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { FinancialOperationsCenterProps } from '@/app/components/lawyer/FinancialOperationsCenter/focProps';

export const LazyFinancialOperationsCenter =
    createPreloadableLazyComponent<FinancialOperationsCenterProps>(() =>
        import('@/app/components/lawyer/FinancialOperationsCenter').then((m) => ({
            default: m.FinancialOperationsCenter,
        })),
    );

export function prefetchFinancialOperationsCenter(): void {
    void LazyFinancialOperationsCenter.preload();
}
