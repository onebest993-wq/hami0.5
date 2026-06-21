/**
 * تحميل مرحلي لإضبارة التنفيذ — shell أولاً ثم الجسم الثقيل.
 */
type ExecutionDashboardModule = typeof import('@/app/components/lawyer/ExecutionDashboard');

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

/** مرحلة 1: الهيكل + تبويبات؛ مرحلة 2: الجسم الكامل عند الخمول */
export function prefetchExecutionDashboardPhased(): void {
    if (typeof window === 'undefined') return;

    void import('@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyShell')
        .then((shell) => {
            shell.prefetchExecutionDashboardShell();
            shell.prefetchExecutionFollowupDefaultTab();
        })
        .catch(() => undefined);

    const scheduleBody = () => {
        if (!executionModulePromise) {
            executionModulePromise = createExecutionModuleImport();
        }
        void executionModulePromise
            .then(() =>
                import('@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyShell').then((shell) => {
                    shell.prefetchExecutionOverlayModals();
                    shell.prefetchExecutionModalContainers();
                }),
            )
            .catch(() => {
                executionModulePromise = null;
            });
    };

    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(scheduleBody, { timeout: 4000 });
    } else {
        window.setTimeout(scheduleBody, 1200);
    }
}

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        executionModulePromise = null;
    });
}
