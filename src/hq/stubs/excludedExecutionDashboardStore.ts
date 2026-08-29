/** بديل بناء المقر — مخزن التنفيذ ليس سطح المقر. */
export function useExecutionDashboardStore(): {
    getState: () => { resetStore: () => void; purgeDossierScopedState: (id: string) => void };
} {
    return {
        getState: () => ({
            resetStore: () => undefined,
            purgeDossierScopedState: () => undefined,
        }),
    };
}

export function isInabaSubFileId(): boolean {
    return false;
}
