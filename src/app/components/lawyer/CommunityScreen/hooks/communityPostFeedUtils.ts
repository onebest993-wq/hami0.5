import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { mergeCommunityPostsById, sortCommunityPosts } from '@/app/services/cloud/lawyerCommunityCloud';
import {
    compareCommunityPostsByUpvotes,
    compareCommunityPostsForFeed,
} from '@/app/services/forum/forumUrgentConsultation';
import { communityTagMatchesFilter, normalizeCommunityTags, resolveCommunityPostTags } from '../repositoryTagUtils';

export function normalizeCommunityPostsPage(page: CommunityPost[]): CommunityPost[] {
    return page.map((p) => ({ ...p, tags: normalizeCommunityTags(p.tags) }));
}

export function mergeSortedCommunityPosts(
    prev: CommunityPost[],
    page: CommunityPost[],
): CommunityPost[] {
    return sortCommunityPosts(mergeCommunityPostsById(prev, normalizeCommunityPostsPage(page)));
}

/** يحدّ الذاكرة — يحافظ على المثبّتة ثم الأحدث في ترتيب الخلاصة */
export function trimCommunityPostsRetention(posts: CommunityPost[], max: number): CommunityPost[] {
    if (max <= 0 || posts.length <= max) return posts;
    const pinned = posts.filter((p) => p.isPinned);
    const pinnedIds = new Set(pinned.map((p) => p.id));
    const unpinned = posts.filter((p) => !pinnedIds.has(p.id));
    const unpinnedBudget = Math.max(0, max - pinned.length);
    const keptUnpinned = unpinned.slice(0, unpinnedBudget);
    return sortCommunityPosts([...pinned, ...keptUnpinned]);
}

/** مقارنة رخيصة لتفادي إعادة رسم الخلاصة إن لم يتغيّر الاستطلاع */
export function areCommunityPostListsEquivalent(a: CommunityPost[], b: CommunityPost[]): boolean {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        const pa = a[i];
        const pb = b[i];
        if (
            pa.id !== pb.id ||
            pa.content !== pb.content ||
            Boolean(pa.isEdited) !== Boolean(pb.isEdited) ||
            pa.updatedAt !== pb.updatedAt ||
            pa.upvoterIds.length !== pb.upvoterIds.length ||
            pa.comments.length !== pb.comments.length ||
            Boolean(pa.isPinned) !== Boolean(pb.isPinned) ||
            Boolean(pa.isLocked) !== Boolean(pb.isLocked) ||
            (pa.tags ?? []).join('\0') !== (pb.tags ?? []).join('\0') ||
            (pa.bestCommentId ?? null) !== (pb.bestCommentId ?? null)
        ) {
            return false;
        }
    }
    return true;
}

export function computeVisibleCommunityPosts(params: {
    posts: CommunityPost[];
    mutedIds: Set<string>;
    currentUserId: string | null;
    forumFeedScope: 'all' | 'following';
    followingIds: Set<string>;
    selectedFilterIndex: number;
    filterLabels: readonly string[];
    /** يُمرَّر لإعادة ترتيب الاستشارات العاجلة دون تغيير المنطق */
    urgentPriorityTick?: number;
}): CommunityPost[] {
    void params.urgentPriorityTick;
    const {
        posts,
        mutedIds,
        currentUserId,
        forumFeedScope,
        followingIds,
        selectedFilterIndex,
        filterLabels,
    } = params;

    const uniquePosts = mergeCommunityPostsById([], posts);

    const baseList = uniquePosts.filter(
        (p) =>
            !p.groupId &&
            (!mutedIds.has(p.authorId) || p.authorId === currentUserId) &&
            (forumFeedScope === 'all' ||
                followingIds.has(p.authorId) ||
                (currentUserId !== null && p.authorId === currentUserId)),
    );
    const list = baseList.slice();

    if (selectedFilterIndex === 1) {
        list.sort((a, b) => compareCommunityPostsByUpvotes(a, b));
        return list;
    }
    if (selectedFilterIndex >= 2) {
        const topicLabel = filterLabels[selectedFilterIndex];
        return list
            .filter((p) =>
                communityTagMatchesFilter(resolveCommunityPostTags(p.content, p.tags), topicLabel),
            )
            .sort((a, b) => compareCommunityPostsForFeed(a, b));
    }
    return list.sort((a, b) => compareCommunityPostsForFeed(a, b));
}

export function computeGroupVisiblePosts(
    groupPosts: CommunityPost[],
    mutedIds: Set<string>,
    currentUserId: string | null,
): CommunityPost[] {
    return groupPosts.filter(
        (p) => !mutedIds.has(p.authorId) || p.authorId === currentUserId,
    );
}
