import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { mergeCommunityPostsById, sortCommunityPosts, syncCommunityPostToLocalMirror } from '@/app/services/cloud/lawyerCommunityCloud';
import { resolveCommunityPostTags } from './repositoryTagUtils';

type InsertOptimisticForumPostParams = {
    post: CommunityPost;
    sourceContent: string;
    activeGroupId: string | null;
    appendPublishedGroupPost: (saved: CommunityPost) => void;
    onForumPostPublished?: () => void;
    setPosts: (updater: (prev: CommunityPost[]) => CommunityPost[]) => void;
};

export function insertOptimisticForumPost({
    post,
    sourceContent,
    activeGroupId,
    appendPublishedGroupPost,
    onForumPostPublished,
    setPosts,
}: InsertOptimisticForumPostParams): CommunityPost {
    const optimistic = {
        ...post,
        tags: resolveCommunityPostTags(sourceContent, post.tags),
    };
    if (activeGroupId) {
        appendPublishedGroupPost(optimistic);
    } else {
        onForumPostPublished?.();
        setPosts((prev) => sortCommunityPosts(mergeCommunityPostsById(prev, [optimistic])));
    }
    syncCommunityPostToLocalMirror(optimistic);
    return optimistic;
}

type SettlePublishedForumPostParams = {
    saved: CommunityPost;
    post: CommunityPost;
    optimistic: CommunityPost;
    activeGroupId: string | null;
    appendPublishedGroupPost: (saved: CommunityPost) => void;
    setPosts: (updater: (prev: CommunityPost[]) => CommunityPost[]) => void;
};

export function settlePublishedForumPost({
    saved,
    post,
    optimistic,
    activeGroupId,
    appendPublishedGroupPost,
    setPosts,
}: SettlePublishedForumPostParams): CommunityPost {
    const normalized = {
        ...saved,
        attachment: saved.attachment ?? post.attachment ?? optimistic.attachment ?? null,
        tags: resolveCommunityPostTags(saved.content, saved.tags),
    };
    if (saved.groupId ?? activeGroupId) {
        appendPublishedGroupPost(normalized);
    } else {
        setPosts((prev) => {
            const withoutStaleOptimistic =
                saved.id !== post.id ? prev.filter((item) => item.id !== post.id) : prev;
            return sortCommunityPosts(mergeCommunityPostsById(withoutStaleOptimistic, [normalized]));
        });
    }
    return normalized;
}
