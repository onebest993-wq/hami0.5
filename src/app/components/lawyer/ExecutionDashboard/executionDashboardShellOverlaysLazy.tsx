import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';

const executionShellOverlaysImport = () =>
    import('./components/ExecutionDashboardShellOverlays').then((m) => ({
        default: m.ExecutionDashboardShellOverlays,
    }));

/**
 * preload-aware — طبقة الـ overlays تقف أمام كل النوافذ (قرارات/تبليغ/دفع…)؛
 * دورة تعليق واحدة هنا كانت تؤخر أول فتح لأي نافذة إطاراً كاملاً.
 */
export const LazyExecutionDashboardShellOverlays = createPreloadableLazyComponent(
    executionShellOverlaysImport,
);

export function prefetchExecutionDashboardShellOverlays(): void {
    void LazyExecutionDashboardShellOverlays.preload();
}
