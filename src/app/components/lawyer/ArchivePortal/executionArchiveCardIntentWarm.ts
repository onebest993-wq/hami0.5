import type { ExecutionDashboardPrefetchMode } from '@/app/runtime/executionDashboardLoader';

/** تسخين الإضبارة من بطاقة المخزن — بلا برميل lazyComponentsIntent. */
export function warmExecutionDossierFromArchiveCard(
    mode: ExecutionDashboardPrefetchMode = 'intent',
): void {
    void import('@/app/runtime/executionWorkspaceWarm')
        .then((m) => m.warmExecutionDossier(mode))
        .catch(() => undefined);
}
