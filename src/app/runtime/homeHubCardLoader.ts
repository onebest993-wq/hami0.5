type LawyerHomeHubCardModule = typeof import('@/app/components/lawyer/LawyerHomeHubCard');

let modulePromise: Promise<LawyerHomeHubCardModule> | null = null;
let resolvedModule: LawyerHomeHubCardModule | null = null;

export function prefetchLawyerHomeHubCardModule(): void {
    if (typeof window === 'undefined') return;
    if (resolvedModule) return;
    modulePromise ??= import('@/app/components/lawyer/LawyerHomeHubCard').then((mod) => {
        resolvedModule = mod;
        return mod;
    });
}

export function loadLawyerHomeHubCardModule(): Promise<LawyerHomeHubCardModule> {
    prefetchLawyerHomeHubCardModule();
    return modulePromise!;
}

export function isLawyerHomeHubCardModuleResolved(): boolean {
    return resolvedModule != null;
}

export function peekLawyerHomeHubCardModule(): LawyerHomeHubCardModule | null {
    return resolvedModule;
}

/** للاختبارات */
export function resetLawyerHomeHubCardLoaderForTests(): void {
    modulePromise = null;
    resolvedModule = null;
}
