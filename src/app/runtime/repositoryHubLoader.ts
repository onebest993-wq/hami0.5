type RepositoryHubModule = typeof import('@/app/components/lawyer/SmartRepositoryModal');

let hubModulePromise: Promise<RepositoryHubModule> | null = null;

export function loadRepositoryHubModule(): Promise<RepositoryHubModule> {
    if (!hubModulePromise) {
        hubModulePromise = import('@/app/components/lawyer/SmartRepositoryModal');
    }
    return hubModulePromise;
}

/** Prefetch chunk المستودع الذكي الموحّد — يُستدعى من hover الدوك */
export function prefetchRepositoryHubModule(): void {
    if (typeof window === 'undefined') return;
    void loadRepositoryHubModule().catch(() => undefined);
}
