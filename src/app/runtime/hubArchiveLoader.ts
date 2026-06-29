type LawsuitsWorkspaceModule = typeof import('@/app/components/lawyer/LawsuitsWorkspace');
type ArchivePortalModule = typeof import('@/app/components/lawyer/ArchivePortal.tsx');

let lawsuitsWorkspacePromise: Promise<LawsuitsWorkspaceModule> | null = null;
let archivePortalPromise: Promise<ArchivePortalModule> | null = null;

export function loadLawsuitsWorkspaceModule(): Promise<LawsuitsWorkspaceModule> {
    if (!lawsuitsWorkspacePromise) {
        lawsuitsWorkspacePromise = import('@/app/components/lawyer/LawsuitsWorkspace');
    }
    return lawsuitsWorkspacePromise;
}

export function loadArchivePortalModule(): Promise<ArchivePortalModule> {
    if (!archivePortalPromise) {
        archivePortalPromise = import('@/app/components/lawyer/ArchivePortal.tsx');
    }
    return archivePortalPromise;
}

/** دعاوى — workspace + portal */
export function loadLawsuitArchiveHubModule(): Promise<[LawsuitsWorkspaceModule, ArchivePortalModule]> {
    return Promise.all([loadLawsuitsWorkspaceModule(), loadArchivePortalModule()]);
}

/** تنفيذ — portal الإضابير */
export function loadExecutionArchiveHubModule(): Promise<ArchivePortalModule> {
    return loadArchivePortalModule();
}

export function prefetchLawsuitArchiveHubModule(): void {
    if (typeof window === 'undefined') return;
    void loadLawsuitArchiveHubModule().catch(() => undefined);
}

export function prefetchExecutionArchiveHubModule(): void {
    if (typeof window === 'undefined') return;
    void loadExecutionArchiveHubModule().catch(() => undefined);
}
