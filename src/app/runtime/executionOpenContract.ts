/**
 * عقد فتح موحّد لمسارات التنفيذ الثقيلة.
 *
 * المبدأ: kick تسخين → commit فوري → BootChrome يغطي الباقي.
 * يطابق الدعوى/الجزائي — ممنوع انتظار first-paint قبل setActiveFile / فتح النموذج.
 *
 * بلا استيراد متزامن لـ creation/dashboard/workspace loaders — حتى لا تُسحب إلى Runtime stem.
 */
import type { ExecutionDashboardPrefetchMode } from '@/app/runtime/executionDashboardLoader';

function loadExecutionDashboardLoader() {
    return import('@/app/runtime/executionDashboardLoader');
}

function loadExecutionWorkspaceWarm() {
    return import('@/app/runtime/executionWorkspaceWarm');
}

function loadExecutionCreationLoader() {
    return import('@/app/runtime/executionCreationLoader');
}

/** تسخين إضبارة — fire-and-forget؛ لا يعلّق النقرة */
export function prepareExecutionDossierOpen(
    mode: ExecutionDashboardPrefetchMode = 'urgent',
): void {
    if (typeof window === 'undefined') return;
    // OverlayEntry خارج مسار التسخين المعتاد — hop بارد قبل Portal/Dashboard
    void import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionDossierOverlayEntry'
    ).catch(() => undefined);
    void loadExecutionDashboardLoader()
        .then(async (loader) => {
            if (loader.isExecutionDossierFirstPaintReady() && loader.getCachedExecutionDashboard()) {
                return;
            }
            const warm = await loadExecutionWorkspaceWarm();
            warm.warmExecutionDossier(mode);
            void warm.warmExecutionDossierUntilReady(mode).then(() => {
                if (!loader.getCachedExecutionDashboard()) {
                    void loader.loadExecutionDashboardModule().catch(() => undefined);
                }
            });
            if (!loader.getCachedExecutionDashboard()) {
                void loader.loadExecutionDashboardModule().catch(() => undefined);
            }
        })
        .catch(() => undefined);
}

/** commit فوري بعد kick التسخين — مصدر الحقيقة للتقويم / البحث / التنقّل / الأرشيف */
export function openExecutionDossierWithContract(
    commit: () => void,
    mode: ExecutionDashboardPrefetchMode = 'urgent',
): void {
    prepareExecutionDossierOpen(mode);
    commit();
}

/** تسخين نموذج الإنشاء — fire-and-forget؛ BootShell يغطي إن لم يكتمل */
export function prepareExecutionCreationOpen(): void {
    if (typeof window === 'undefined') return;
    void loadExecutionCreationLoader()
        .then((m) => {
            m.prefetchExecutionCreationSurface();
            if (m.isExecutionCreationSurfaceReady()) return;
            void m.ensureExecutionCreationSurfaceReady().catch(() => undefined);
        })
        .catch(() => undefined);
}

/** commit فتح الإنشاء فوراً بعد kick التسخين */
export function openExecutionCreationWithContract(commit: () => void): void {
    prepareExecutionCreationOpen();
    commit();
}
