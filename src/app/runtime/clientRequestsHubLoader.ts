type ClientRequestsHubModule = typeof import('@/app/components/lawyer/ClientRequestsHub');

let modulePromise: Promise<ClientRequestsHubModule> | null = null;

export function resetClientRequestsHubLoaderForTests(): void {
    modulePromise = null;
}

function ensureModule(): Promise<ClientRequestsHubModule> {
    if (!modulePromise) {
        modulePromise = import('@/app/components/lawyer/ClientRequestsHub').catch((error) => {
            modulePromise = null;
            throw error;
        });
    }
    return modulePromise;
}

export function loadClientRequestsHubModule(): Promise<ClientRequestsHubModule> {
    return ensureModule();
}

export function prefetchClientRequestsHubModule(): void {
    if (typeof window === 'undefined') return;
    void ensureModule().catch(() => undefined);
}
