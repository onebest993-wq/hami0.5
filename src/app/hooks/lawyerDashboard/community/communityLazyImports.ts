import { prefetchCommunityOverlayEntry } from '@/app/runtime/communityOverlayEntryLoader';
import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';

export function loadForumIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/forumIntentWarm');
}

export function loadCommunityBootHydrator() {
    return import('@/app/runtime/communityBootHydrator');
}

export function loadForumPostsWarmCache() {
    return import('@/app/services/forum/forumPostsWarmCache');
}

export function loadCommunityScreenModule(): Promise<unknown> {
    return import('@/app/runtime/communityHubLoader').then((m) => m.loadCommunityScreenModule());
}

export function ensureCommunityScreenContentLoaded(): Promise<unknown> {
    return import('@/app/components/lawyer/CommunityScreen').then((m) =>
        m.ensureCommunityScreenContentLoaded(),
    );
}

export function prefetchCommunityHostChunks(): void {
    prefetchCommunityOverlayEntry();
    void ensureDeferredFeatureStylesLoaded();
    void ensureCommunityScreenContentLoaded().catch(() => undefined);
    void loadCommunityScreenModule().catch(() => undefined);
    void import('@/app/components/lawyer/CommunityScreen/CommunityScreenHost').catch(() => undefined);
}
