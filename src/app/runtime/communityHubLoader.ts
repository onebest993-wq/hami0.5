import type { ComponentType } from 'react';
import type { CommunityScreenProps } from '@/app/components/lawyer/CommunityScreen';

type CommunityScreenModule = typeof import('@/app/components/lawyer/CommunityScreen.tsx');

export type CommunityScreenComponent = ComponentType<CommunityScreenProps>;

let hubModulePromise: Promise<CommunityScreenModule> | null = null;
let cachedCommunityScreen: CommunityScreenComponent | null = null;

export function isCommunityScreenModuleResolved(): boolean {
    return cachedCommunityScreen !== null;
}

export function getCachedCommunityScreen(): CommunityScreenComponent | null {
    return cachedCommunityScreen;
}

/** للاختبارات */
export function resetCommunityHubModuleCacheForTests(): void {
    hubModulePromise = null;
    cachedCommunityScreen = null;
}

function ensureCommunityScreenModulePromise(): Promise<CommunityScreenModule> {
    if (!hubModulePromise) {
        hubModulePromise = import('@/app/components/lawyer/CommunityScreen.tsx')
            .then((mod) => {
                if (mod?.CommunityScreen) {
                    cachedCommunityScreen = mod.CommunityScreen;
                }
                return mod;
            })
            .catch((err) => {
                hubModulePromise = null;
                throw err;
            });
    }
    return hubModulePromise;
}

export function loadCommunityScreenModule(): Promise<CommunityScreenModule> {
    return ensureCommunityScreenModulePromise();
}

/** Prefetch chunk المنتدى — يُستدعى من hover الدوك */
export function prefetchCommunityScreenModule(): void {
    if (typeof window === 'undefined') return;
    void ensureCommunityScreenModulePromise().catch(() => undefined);
}

/** يضمن جاهزية shell المنتدى للفتح الفوري */
export function hydrateCommunityScreenForInstantOpen(): Promise<boolean> {
    return ensureCommunityScreenModulePromise()
        .then(() => true)
        .catch(() => false);
}
