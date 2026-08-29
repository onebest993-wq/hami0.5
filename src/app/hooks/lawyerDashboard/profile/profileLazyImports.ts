import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';
import { ensureDeferredAppStylesLoaded } from '@/app/runtime/deferredAppStyles';

/** Matches profileBootHydrator.ts PROFILE_PRIME_HOST_EVENT — local to avoid sync stem pull. */
export const PROFILE_PRIME_HOST_EVENT = 'hami:profile-prime-host';

export function loadProfileIntentWarm() {
    return import('@/app/runtime/profileShellPrime');
}

export function loadProfileBootHydrator() {
    return import('@/app/runtime/profileBootHydrator');
}

export function loadProfileWarmCache() {
    return import('@/app/services/profile/profileWarmCache');
}

export function prefetchProfileShellChunks(): void {
    void ensureDeferredFeatureStylesLoaded();
    void ensureDeferredAppStylesLoaded().catch(() => undefined);
    void import('@/app/components/lawyer/dashboard/profile/ProfileTabHost').catch(() => undefined);
    void import('@/app/runtime/royalLawyerProfileLoader')
        .then((m) => {
            m.prefetchProfileHubModule();
            return m.loadProfileHubModule();
        })
        .then(() => import('@/app/runtime/profilePageExtrasPrefetch'))
        .then((extras) => extras.prefetchProfileCustomBlocksChunk())
        .catch(() => undefined);
}
