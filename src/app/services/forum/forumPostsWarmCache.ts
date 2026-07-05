import type { CommunityPost } from '@/app/services/cloud/lawyerCommunityTypes';
import { fetchCommunityPosts, prefetchCommunityCloudModule } from '@/app/services/forum/communityCloudLoader';
import { sortCommunityPosts } from '@/app/services/forum/forumCommunityRuntime';
import { withForumAsyncTimeout } from '@/app/components/lawyer/CommunityScreen/forumAsync';

let warmedPosts: CommunityPost[] | null = null;
let warmPromise: Promise<CommunityPost[]> | null = null;

/** تجهيز cache محلي للمنشورات — يُستدعى عند hover/فتح المنتدى */
export function warmForumPostsCache(): void {
    if (warmPromise) return;
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

export async function readForumPostsCache(): Promise<CommunityPost[]> {
    if (warmedPosts) return warmedPosts;
    warmForumPostsCache();
    return warmPromise ?? Promise.resolve([]);
}

export function resetForumPostsCacheForTests(): void {
    warmedPosts = null;
    warmPromise = null;
}
