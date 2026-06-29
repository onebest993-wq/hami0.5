type FieldTasksHubModule = [
    typeof import('@/app/components/lawyer/dashboard/FieldTasksBottomSheet'),
    typeof import('@/app/components/lawyer/dashboard/TasksManagerOverlay'),
    typeof import('@/app/components/lawyer/dashboard/TasksManager'),
];

let hubModulePromise: Promise<FieldTasksHubModule> | null = null;

export function loadFieldTasksHubModule(): Promise<FieldTasksHubModule> {
    if (!hubModulePromise) {
        hubModulePromise = Promise.all([
            import('@/app/components/lawyer/dashboard/FieldTasksBottomSheet'),
            import('@/app/components/lawyer/dashboard/TasksManagerOverlay'),
            import('@/app/components/lawyer/dashboard/TasksManager'),
        ]);
    }
    return hubModulePromise;
}

export function prefetchFieldTasksHubModule(): void {
    if (typeof window === 'undefined') return;
    void loadFieldTasksHubModule().catch(() => undefined);
}
