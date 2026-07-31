import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';

const executionPhoneBodyImport = () =>
    import('./components/ExecutionDashboardPhoneBody').then((m) => ({
        default: m.ExecutionDashboardPhoneBody,
    }));

/**
 * preload-aware — بعد deep warm يُرسم جسم الهاتف مباشرة في نفس commit فتح
 * الإضبارة بلا دورة تعليق Suspense (كانت تُبقي هيكل التحميل إطاراً إضافياً).
 */
export const LazyExecutionDashboardPhoneBody = createPreloadableLazyComponent(
    executionPhoneBodyImport,
);

export function prefetchExecutionDashboardPhoneBody(): void {
    void LazyExecutionDashboardPhoneBody.preload();
}
