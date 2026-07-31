import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';
import { ensureDeferredAppStylesLoaded } from '@/app/runtime/deferredAppStyles';
import { prefetchProfileHubModule } from '@/app/runtime/profileHubLoader';

/** Matches profileBootHydrator.ts PROFILE_PRIME_HOST_EVENT — local to avoid sync stem pull. */
export const PROFILE_PRIME_HOST_EVENT = 'hami:profile-prime-host';

export function loadProfileIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/profileIntentWarm');
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
    prefetchProfileHubModule();
}

export function warmProfileOpenSideEffects(userId: string | null): void {
    void loadProfileIntentWarm().then((m) => m.warmProfileOnOpen(userId));
    void loadProfileWarmCache()
        .then((m) => m.ensureProfilePaintReady(userId))
        .catch(() => undefined);
    void loadProfileBootHydrator()
        .then((m) => m.hydrateProfileShellForInstantOpenWithData(userId, true))
        .catch(() => undefined);
}
