type CommunityScreenModule = typeof import('@/app/components/lawyer/CommunityScreen.tsx');

let hubModulePromise: Promise<CommunityScreenModule> | null = null;

export function loadCommunityScreenModule(): Promise<CommunityScreenModule> {
    if (!hubModulePromise) {
        hubModulePromise = import('@/app/components/lawyer/CommunityScreen.tsx');
    }
    return hubModulePromise;
}

export function prefetchCommunityScreenModule(): void {
    if (typeof window === 'undefined') return;
    void loadCommunityScreenModule().catch(() => undefined);
}
