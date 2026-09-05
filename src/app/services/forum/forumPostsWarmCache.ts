import type { CommunityPost } from '@/app/services/cloud/lawyerCommunityTypes';
import { fetchCommunityPosts, prefetchCommunityCloudModule } from '@/app/services/forum/communityCloudLoader';
import { sortCommunityPosts } from '@/app/services/forum/forumCommunityRuntime';
import { withForumAsyncTimeout } from '@/app/components/lawyer/CommunityScreen/forumAsync';
import { canUseNetworkFeatures } from '@/app/services/auth/lawyerAccountStatus';
import { getLiveAuthUserId } from '@/app/utils/liveAuthUserId';
import { readPersistedSupabaseAuth } from '@/app/utils/authStorage';

let warmedPosts: CommunityPost[] | null = null;
let warmPromise: Promise<CommunityPost[]> | null = null;

function liveSessionCanUseForumNetwork(): boolean {
    const persisted = readPersistedSupabaseAuth();
    const uid = getLiveAuthUserId() ?? persisted.user?.id ?? null;
    const meta = (persisted.user?.user_metadata ?? null) as Record<string, unknown> | null;
    return canUseNetworkFeatures(uid, meta);
}

/** تجهيز cache محلي للمنشورات — يُستدعى عند hover/فتح المنتدى */
export function warmForumPostsCache(): void {
    if (warmPromise) return;
    if (!liveSessionCanUseForumNetwork()) return;
    prefetchCommunityCloudModule();
    warmPromise = withForumAsyncTimeout(
        fetchCommunityPosts().then((rows) => {
            const local = sortCommunityPosts(rows).filter((p) => !p.groupId);
            warmedPosts = local;
            return local;
        }),
        4_000,
        [],
    ).catch(() => {
        warmedPosts = [];
        return [];
    });
}

export function peekForumPostsCache(): CommunityPost[] | null {
    return warmedPosts;
}

/** لقطة محلية مشفّرة — بلا شبكة. تملأ الكاش قبل الجلب إن كان فارغاً. */
export function warmForumPostsCacheFromLocal(): void {
    if (warmedPosts && warmedPosts.length > 0) return;
    void import('@/app/services/forum/forumCommunityRuntime')
        .then((m) => m.CommunityDB.listPosts())
        .then((rows) => {
            if (warmedPosts && warmedPosts.length > 0) return;
            const local = sortCommunityPosts(rows).filter((p) => !p.groupId);
            if (local.length > 0) warmedPosts = local;
        })
        .catch(() => undefined);
}

export async function readForumPostsCache(): Promise<CommunityPost[]> {
    if (warmedPosts) return warmedPosts;
    warmForumPostsCache();
    return warmPromise ?? Promise.resolve([]);
}

export function resetForumPostsCacheForTests(): void {
    warmedPosts = null;
    warmPromise = null;
}
