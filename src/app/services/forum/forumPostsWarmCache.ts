import type { CommunityPost } from '@/app/services/cloud/lawyerCommunityTypes';
import { fetchCommunityPosts, prefetchCommunityCloudModule } from '@/app/services/forum/communityCloudLoader';

let warmedPosts: CommunityPost[] | null = null;
let warmPromise: Promise<CommunityPost[]> | null = null;

/** تجهيز cache محلي للمنشورات — يُستدعى عند hover/فتح المنتدى */
export function warmForumPostsCache(): void {
    if (warmPromise) return;
    prefetchCommunityCloudModule();
    warmPromise = import('@/app/services/cloud/lawyerCommunityCloud')
        .then(({ sortCommunityPosts }) =>
            fetchCommunityPosts().then((rows) => {
                const local = sortCommunityPosts(rows).filter((p) => !p.groupId);
                warmedPosts = local;
                return local;
            }),
        )
        .catch(() => {
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
