/**
 * عقد فتح موحّد لمسارات التنفيذ الثقيلة.
 *
 * المبدأ: kick تسخين → commit فوري → BootChrome يغطي الباقي.
 * يطابق الدعوى/الجزائي — ممنوع انتظار first-paint قبل setActiveFile / فتح النموذج.
 *
 * بلا استيراد متزامن لـ creation/dashboard/workspace loaders — حتى لا تُسحب إلى Runtime stem.
 */
import type { ExecutionDashboardPrefetchMode } from '@/app/runtime/executionDashboardLoader';

let executionOpenContractOpenCounter = 0;
let lastActiveContractExecutionId: string | number = 0;
let executionOpenContractSessionId = 0;
let activeExecutionOpenContractSessionId = 0;
const executionOpenContractSessionIdRef = { current: 0 };
const activeExecutionOpenContractSessionIdRef = { current: 0 };

function _openContractSessionBump() {
    executionOpenContractOpenCounter += 1;
    executionOpenContractSessionId = executionOpenContractOpenCounter;
    executionOpenContractSessionIdRef.current = executionOpenContractSessionId;
    activeExecutionOpenContractSessionId = executionOpenContractSessionId;
    activeExecutionOpenContractSessionIdRef.current = activeExecutionOpenContractSessionId;
}

export function cleanupExecutionOpenContract(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/services/execution/tearDownExecutionFloatingState')
        .then((m) => m.tearDownExecutionFloatingState({
            targetSurface: 'execution-shell',
            reason: 'navigate-away',
        }))
        .catch(() => { /* tearDown never throws */ });
    activeExecutionOpenContractSessionId = 0;
    activeExecutionOpenContractSessionIdRef.current = 0;
}

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
    _openContractSessionBump();
    lastActiveContractExecutionId = `dossier-${Date.now()}`;
    // OverlayEntry خارج مسار التسخين المعتاد — hop بارد قبل Portal/Dashboard
    void import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionDossierOverlayEntry'
    ).catch(() => undefined);
    void loadExecutionDashboardLoader()
        .then(async (loader) => {
            if (executionOpenContractSessionIdRef.current !== activeExecutionOpenContractSessionIdRef.current) return;
            if (loader.isExecutionDossierFirstPaintReady() && loader.getCachedExecutionDashboard()) {
                return;
            }
            if (executionOpenContractSessionIdRef.current !== activeExecutionOpenContractSessionIdRef.current) return;
            const warm = await loadExecutionWorkspaceWarm();
            if (executionOpenContractSessionIdRef.current !== activeExecutionOpenContractSessionIdRef.current) return;
            warm.warmExecutionDossier(mode);
            void warm.warmExecutionDossierUntilReady(mode).then(() => {
                if (executionOpenContractSessionIdRef.current !== activeExecutionOpenContractSessionIdRef.current) return;
                if (!loader.getCachedExecutionDashboard()) {
                    void loader.loadExecutionDashboardModule().catch(() => undefined);
                }
            });
            if (executionOpenContractSessionIdRef.current !== activeExecutionOpenContractSessionIdRef.current) return;
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

/** تسخين نموذج الإنشاء — fire-and-forget؛ الهيكل الهندسي يغطي إن لم يكتمل */
export function prepareExecutionCreationOpen(): void {
    if (typeof window === 'undefined') return;
    _openContractSessionBump();
    lastActiveContractExecutionId = `creation-${Date.now()}`;
    void loadExecutionCreationLoader()
        .then((m) => {
            if (executionOpenContractSessionIdRef.current !== activeExecutionOpenContractSessionIdRef.current) return;
            m.prefetchExecutionCreationSurface();
            if (executionOpenContractSessionIdRef.current !== activeExecutionOpenContractSessionIdRef.current) return;
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
