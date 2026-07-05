/**
 * تحميل مرحلي لإضبارة التنفيذ — chunk رئيسي أولاً، ثم shell عند الخمول أو النية.
 */
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';
import { prefetchDeferredFeatureStyles } from '@/app/runtime/deferredFeatureStyles';

type ExecutionDashboardModule = typeof import('@/app/components/lawyer/ExecutionDashboard');

export type ExecutionDashboardPrefetchMode = 'deferred' | 'intent' | 'urgent';

let executionModulePromise: Promise<ExecutionDashboardModule> | null = null;

export function resetExecutionDashboardModuleCache(): void {
    executionModulePromise = null;
}

function createExecutionModuleImport(): Promise<ExecutionDashboardModule> {
    return import('@/app/components/lawyer/ExecutionDashboard').catch((err) => {
        executionModulePromise = null;
        throw err;
    });
}

export function loadExecutionDashboardModule(): Promise<ExecutionDashboardModule> {
    if (!executionModulePromise) {
        executionModulePromise = createExecutionModuleImport();
    }
    return executionModulePromise;
}

function prefetchExecutionShellChunks(urgent: boolean): void {
    void import('@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyShell')
        .then((shell) => {
            shell.prefetchExecutionDashboardShell();
            shell.prefetchExecutionFollowupDefaultTab();
            if (urgent) {
                shell.prefetchExecutionDashboardPhoneBody();
                shell.prefetchExecutionModalContainers();
                const scheduleSecondary = () => {
                    shell.prefetchExecutionOverlayModals();
                };
                if (typeof requestIdleCallback !== 'undefined') {
                    requestIdleCallback(scheduleSecondary, { timeout: 400 });
                } else {
                    window.setTimeout(scheduleSecondary, 100);
                }
            }
        })
        .catch(() => undefined);
}

/** يبدأ تحميل الـ chunk الرئيسي فقط — بدون منافسة أرشيف التنفيذ */
export function prefetchExecutionDashboardCore(): void {
    if (typeof window === 'undefined') return;
    prefetchDeferredFeatureStyles();
    void loadExecutionDashboardModule().catch(() => {
        executionModulePromise = null;
    });
}

/**
 * deferred: بعد فتح قسم التنفيذ — لا يُشغَّل على مسار الفتح المباشر
 * intent: hover على بطاقة/الهَب — chunk رئيسي فوراً، shell عند الخمول
 * urgent: نقرة فتح إضبارة — chunk + shell الحرجة فوراً
 */
export function prefetchExecutionDashboardByMode(mode: ExecutionDashboardPrefetchMode): void {
    if (typeof window === 'undefined') return;

    switch (mode) {
        case 'deferred':
            scheduleIdleWork(() => {
                prefetchExecutionDashboardCore();
                void loadExecutionDashboardModule()
                    .then(() => scheduleIdleWork(() => prefetchExecutionShellChunks(false), 1_200))
                    .catch(() => undefined);
            }, 2_000);
            break;
        case 'intent':
            prefetchExecutionDashboardCore();
            scheduleIdleWork(() => prefetchExecutionShellChunks(false), 700);
            break;
        case 'urgent':
            prefetchExecutionDashboardCore();
            prefetchExecutionShellChunks(true);
            break;
        default:
            break;
    }
}

/** @deprecated استخدم prefetchExecutionDashboardByMode — للتوافق مع الاستدعاءات القديمة */
export function prefetchExecutionDashboardPhased(): void {
    prefetchExecutionDashboardByMode('urgent');
}
