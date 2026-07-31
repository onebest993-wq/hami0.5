type SyncExecutionTaskDueParams = {
    userId?: string | null;
    executionId: string | number;
    task: { id: string; title: string; dueDate?: string; trashedAt?: string | null };
    caseNo?: string;
    clientName?: string;
};

type IncrementalSyncModule = typeof import('@/app/services/calendar/dossierSync/incrementalSync');

let incrementalSyncModulePromise: Promise<IncrementalSyncModule> | null = null;

function loadIncrementalSyncModule(): Promise<IncrementalSyncModule> {
    if (!incrementalSyncModulePromise) {
        incrementalSyncModulePromise = import('@/app/services/calendar/dossierSync/incrementalSync');
    }
    return incrementalSyncModulePromise;
}

export function syncExecutionTaskDueDeferred(params: SyncExecutionTaskDueParams): void {
    void loadIncrementalSyncModule()
        .then((module) => {
            module.syncExecutionTaskDue(params);
        })
        .catch(() => undefined);
}

export function prefetchExecutionStayCalendarSync(): void {
    void loadIncrementalSyncModule().catch(() => undefined);
}
