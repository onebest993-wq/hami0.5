/**
 * تحميل وحدة إضبارة التنفيذ فقط — بلا استيراد البوابة، حتى لا تُغلق دائرة
 * Portal → loader → Portal (كانت تكسر HMR).
 */
type ExecutionDashboardModule = typeof import('@/app/components/lawyer/ExecutionDashboard.tsx');

let executionModulePromise: Promise<ExecutionDashboardModule> | null = null;

export function resetExecutionDashboardModuleCache(): void {
    executionModulePromise = null;
}

function createExecutionModuleImport(): Promise<ExecutionDashboardModule> {
    return import('@/app/components/lawyer/ExecutionDashboard.tsx')
        .then((mod) => mod)
        .catch((err) => {
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
