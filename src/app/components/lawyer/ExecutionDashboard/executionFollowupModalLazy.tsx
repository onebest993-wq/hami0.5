import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';

const executionFollowupModalPortalImport = () =>
    import('./ExecutionFollowupModalPortal').then((m) => ({
        default: m.ExecutionFollowupModalPortal,
    }));

/**
 * preload-aware — بعد التسخين يُرسم المحضر مباشرة في نفس commit النقرة
 * بدون دورة تعليق Suspense (كانت تظهر وميض هيكل لإطار كامل عند أول فتح).
 */
export const LazyExecutionFollowupModalPortal = createPreloadableLazyComponent(
    executionFollowupModalPortalImport,
);

export function prefetchExecutionFollowupModalPortal(): void {
    void LazyExecutionFollowupModalPortal.preload();
}
