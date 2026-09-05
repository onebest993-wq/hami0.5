import { settleIdleChunkPrefetch } from './settleIdleChunkPrefetch';

const FOLLOWING_PANEL = '@/app/components/lawyer/CommunityScreen/components/ForumFollowingPanel';

export function importForumFollowingPanel() {
    return import('@/app/components/lawyer/CommunityScreen/components/ForumFollowingPanel').then(
        (m) => ({
            default: m.ForumFollowingPanel,
        }),
    );
}

/** Pointer intent on the following control — not the inner-sections factory. */
export function prefetchCommunityFollowingPanel(): void {
    if (typeof window === 'undefined') return;
    void settleIdleChunkPrefetch(FOLLOWING_PANEL, importForumFollowingPanel());
}
