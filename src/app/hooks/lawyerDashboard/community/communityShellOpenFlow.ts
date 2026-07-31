import type { MutableRefObject } from 'react';
import { flushSync } from 'react-dom';

import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';
import { prefetchCommunityOverlayEntry } from '@/app/runtime/communityOverlayEntryLoader';
import {
    clearForumPerfMarks,
    markForumPerfPhase,
} from '@/app/services/forum/forumPerfMetrics';
import {
    ensureCommunityScreenContentLoaded,
    loadCommunityScreenModule,
    loadForumIntentWarm,
    loadForumPostsWarmCache,
} from '@/app/hooks/lawyerDashboard/community/communityLazyImports';

export type CommitCommunityOpenParams = {
    userId: string | null;
    showCommunityRef: MutableRefObject<boolean>;
    setCommunityHostMounted: (mounted: boolean) => void;
    setShowCommunity: (open: boolean) => void;
};

/** فتح المنتدى: perf marks + flushSync فوري ثم warm في الخلفية. */
export function commitCommunityOpen({
    userId,
    showCommunityRef,
    setCommunityHostMounted,
    setShowCommunity,
}: CommitCommunityOpenParams): void {
    if (showCommunityRef.current) return;

    clearForumPerfMarks();
    markForumPerfPhase('open-request');

    flushSync(() => {
        setCommunityHostMounted(true);
        setShowCommunity(true);
        showCommunityRef.current = true;
    });

    markForumPerfPhase('chunk-ready');
    queueMicrotask(() => dismissTransientOverlays('forum'));
    void ensureDeferredFeatureStylesLoaded();
    prefetchCommunityOverlayEntry();
    /* warmForumOnOpen يشحن الكاش + hydrate — لا تكرار hydrate هنا */
    void loadForumIntentWarm().then((m) => m.warmForumOnOpen(userId));
    void ensureCommunityScreenContentLoaded().catch(() => undefined);
    void loadCommunityScreenModule().catch(() => undefined);
    void loadForumPostsWarmCache()
        .then((m) => m.readForumPostsCache())
        .catch(() => undefined);
}
