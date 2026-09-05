/**
 * تسخين محضر المتابعة — يُحمَّل عند نية المحضر فقط.
 * تقييمه يسجّل بنّاء الكيس ويسحب تبويبات المحضر/البوابة خارج شبكة الأدوات.
 */
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { prefetchExecutionDashboardShell } from './executionDashboardLazyRegistryShell';
import { prefetchFollowupMemoPanels } from './executionDashboardFollowupTabLazy';
import { prefetchExecutionFollowupModalPortal } from './executionFollowupModalLazy';
import { prefetchExecutionFollowupModalHost } from './executionFollowupHostLazy';
import { buildFollowupModalSnapshotInput } from './hooks/buildFollowupModalSnapshotInput';
import { primeFollowupModalSnapshotBuilder } from './hooks/followupModalSnapshotBuilderCache';

primeFollowupModalSnapshotBuilder(buildFollowupModalSnapshotInput);

export function runExecutionFollowupOverlayPrefetch(tabId?: string): void {
    primeFollowupModalSnapshotBuilder(buildFollowupModalSnapshotInput);
    if (!isLitePerformanceActive()) {
        prefetchExecutionDashboardShell();
        prefetchFollowupMemoPanels();
    }
    prefetchExecutionFollowupModalHost();
    prefetchExecutionFollowupModalPortal();
    void import('./executionFollowupTabPrefetch')
        .then((m) => {
            if (tabId) {
                m.prefetchExecutionFollowupTab(tabId);
                return;
            }
            m.prefetchExecutionFollowupDefaultTab();
        })
        .catch(() => {});
}
