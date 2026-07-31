import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

/**
 * بوابة إضبارة الدعوى — preload-aware:
 * بعد التسخين تُرسم مباشرة في نفس commit النقرة بلا تعليق Suspense.
 */
export const LazySmartFileModalPortal = createPreloadableLazyComponent(() =>
    import('@/app/components/lawyer/dashboard/SmartFileModalPortal').then((m) => ({
        default: m.SmartFileModalPortal as unknown as LazyComponent,
    })),
);

export function prefetchSmartFileModalPortal(): void {
    void LazySmartFileModalPortal.preload();
}
