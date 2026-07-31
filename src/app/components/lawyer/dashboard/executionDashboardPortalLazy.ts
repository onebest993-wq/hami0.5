import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

/**
 * بوابة إضبارة التنفيذ — preload-aware ومشتركة بين deep warm والـ overlays:
 * بعد التسخين تُرسم البوابة مباشرة في نفس commit النقرة بلا تعليق Suspense
 * (كان أول فتح يومض BootChrome إطاراً حتى مع chunk محمّل).
 */
export const LazyExecutionDashboardPortal = createPreloadableLazyComponent(() =>
    import('@/app/components/lawyer/dashboard/ExecutionDashboardPortal').then((m) => ({
        default: m.ExecutionDashboardPortal as unknown as LazyComponent,
    })),
);

export function prefetchExecutionDashboardPortal(): void {
    void LazyExecutionDashboardPortal.preload();
}

/**
 * @deprecated دورة portal↔first-paint أُزيلت — استخدم preload البوابة + loadExecutionDashboardModule.
 * يُبقى للاختبارات الرجعية التي تثبت عدم استدعائه من first-paint.
 */
export async function ensureExecutionDashboardPortalReady(): Promise<void> {
    await LazyExecutionDashboardPortal.preload();
    const portal = await import('@/app/components/lawyer/dashboard/ExecutionDashboardPortal');
    await portal.prefetchExecutionDashboardComponent();
}
