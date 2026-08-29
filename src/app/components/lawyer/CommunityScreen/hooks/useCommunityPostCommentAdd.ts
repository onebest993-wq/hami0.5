import { useCallback } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import type { CommunityComment } from '@/app/services/lawyer-cloud';
import { publishForumComment } from '@/lib/forumService.js';
import { checkForumRateLimit, peekForumRateLimit } from '../forumRateLimit';
import { newForumEntityId } from '../forumEntityId';
import { resolveForumCommentContent } from '../communityCommentContent';
import { canAddComment } from '../communityPermissions';
import type { UseCommunityPostActionsParams } from './useCommunityPostActions.types';

type CommentAddParams = Omit<
    UseCommunityPostActionsParams,
    'onPostDeleted' | 'commentingPostId' | 'isAdmin'
> & {
    runInflight: (key: string, action: () => Promise<void>) => Promise<void>;
};

export function useCommunityPostCommentAdd({
    lists,
    currentUserId,
    isBanned,
    authUser,
    onThreadSubscribed,
    runInflight,
}: CommentAddParams) {
    const { findPostById, updatePostList } = lists;

    const handleAddComment = useCallback(
        async (postId: string, content: string, parentId?: string): Promise<boolean> => {
            if (!currentUserId) {
                SmartToast.warning('سجّل الدخول للتعليق');
                return false;
            }
            if (isBanned) {
                SmartToast.warning('حسابك محظور من التعليق في المنتدى');
                return false;
            }
            const post = findPostById(postId);
            if (!post || !canAddComment(post, currentUserId, isBanned)) {
                SmartToast.warning(post?.isLocked ? 'النقاش مقفل' : 'تعذّر نشر التعليق');
                return false;
            }
            const resolved = resolveForumCommentContent(content);
            if (!resolved.ok) {
                SmartToast.warning(
                    resolved.reason === 'too_long' ? 'التعليق طويل جداً' : 'لا يمكن نشر تعليق فارغ',
                );
                return false;
            }
            const peeked = peekForumRateLimit('comment', currentUserId);
            if (!peeked.allowed) {
                SmartToast.warning(`انتظر ${peeked.retryAfterSec} ثانية قبل تعليق جديد`);
                return false;
            }

            let published = false;
            await runInflight(`comment-add:${postId}`, async () => {
                const commentId = newForumEntityId();
                const newComment: CommunityComment = {
                    id: commentId,
                    postId,
                    authorId: currentUserId,
                    authorName: authUser?.user_metadata?.fullName || authUser?.email || 'محامي',
                    content: resolved.content,
                    createdAt: new Date().toISOString(),
                    parentId,
                };
                updatePostList(postId, (prev) =>
                    prev.map((p) => {
                        if (p.id !== postId) return p;
                        return {
                            ...p,
                            comments: [...p.comments, newComment],
                            updatedAt: new Date().toISOString(),
                        };
                    }),
                );
                try {
                    const saved = await publishForumComment(postId, newComment);
                    updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? saved : p)));
                    checkForumRateLimit('comment', currentUserId);
                    onThreadSubscribed?.(postId);
                    SmartToast.success('تم نشر التعليق');
                    published = true;
                } catch {
                    updatePostList(postId, (prev) =>
                        prev.map((p) => {
                            if (p.id !== postId) return p;
                            return { ...p, comments: p.comments.filter((c) => c.id !== commentId) };
                        }),
                    );
                    SmartToast.error('تعذّر نشر التعليق');
                }
            });
            return published;
        },
        [authUser, currentUserId, findPostById, isBanned, onThreadSubscribed, runInflight, updatePostList],
    );

    return { handleAddComment };
}
