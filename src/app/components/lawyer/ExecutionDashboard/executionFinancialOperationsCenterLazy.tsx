import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { FinancialOperationsCenterProps } from '@/app/slices/financial/specialtyPublic';

export const LazyFinancialOperationsCenter =
    createPreloadableLazyComponent<FinancialOperationsCenterProps>(() =>
        import('@/app/components/lawyer/FinancialOperationsCenter').then((m) => ({
            default: m.FinancialOperationsCenter,
        })),
    );

export function prefetchFinancialOperationsCenter(): void {
    void LazyFinancialOperationsCenter.preload();
}
