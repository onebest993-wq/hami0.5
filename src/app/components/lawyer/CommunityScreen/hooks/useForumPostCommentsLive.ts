import { useEffect } from 'react';
import type { CommunityComment, CommunityPost } from '@/app/services/lawyer-cloud';
import { subscribeToPostComments } from '@/lib/forumService.js';

type UseForumPostCommentsLiveParams = {
    postId: string | null;
    enabled?: boolean;
    onPostUpdate: (postId: string, updater: (post: CommunityPost) => CommunityPost) => void;
};

export function useForumPostCommentsLive({
    postId,
    enabled = true,
    onPostUpdate,
}: UseForumPostCommentsLiveParams) {
    useEffect(() => {
        if (!enabled || !postId) return;

        const unsubscribe = subscribeToPostComments(postId, (comments, post) => {
            if (!Array.isArray(comments) || !post || typeof post !== 'object') return;
            onPostUpdate(postId, (prev) => {
                const remote = post as CommunityPost;
                if (remote.comments.length === prev.comments.length) {
                    const same =
                        remote.comments.every((c, i) => c.id === prev.comments[i]?.id) &&
                        remote.updatedAt === prev.updatedAt;
                    if (same) return prev;
                }
                return {
                    ...prev,
                    ...remote,
                    comments: comments as CommunityComment[],
                };
            });
        });

        return unsubscribe;
    }, [enabled, onPostUpdate, postId]);
}
