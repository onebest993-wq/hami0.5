import { useCallback } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { ForumApiService } from '@/app/services/forumApiService';
import { resolveForumCommentContent } from '../communityCommentContent';
import { canDeleteComment, canEditComment } from '../communityPermissions';
import type { UseCommunityPostActionsParams } from './useCommunityPostActions.types';

type CommentMutateParams = Omit<
    UseCommunityPostActionsParams,
    'onPostDeleted' | 'commentingPostId' | 'isBanned' | 'authUser' | 'onThreadSubscribed'
> & {
    runInflight: (key: string, action: () => Promise<void>) => Promise<void>;
};

export function useCommunityPostCommentMutate({
    lists,
    currentUserId,
    isAdmin,
    runInflight,
}: CommentMutateParams) {
    const { findPostById, updatePostList } = lists;

    const handleDeleteComment = useCallback(
        async (postId: string, commentId: string) => {
            if (!currentUserId) return;
            const post = findPostById(postId);
            const comment = post?.comments.find((c) => c.id === commentId);
            if (!post || !comment || !canDeleteComment(post, comment, currentUserId, isAdmin)) {
                SmartToast.warning('لا يمكنك حذف هذا التعليق');
                return;
            }
            await runInflight(`comment-del:${commentId}`, async () => {
                const snapshot = findPostById(postId);
                updatePostList(postId, (prev) =>
                    prev.map((p) => {
                        if (p.id !== postId) return p;
                        const target = p.comments.find((x) => x.id === commentId);
                        if (!target || !canDeleteComment(p, target, currentUserId, isAdmin)) return p;
                        return {
                            ...p,
                            comments: p.comments.filter(
                                (item) => item.id !== commentId && item.parentId !== commentId,
                            ),
                            updatedAt: new Date().toISOString(),
                        };
                    }),
                );
                try {
                    const saved = await ForumApiService.deleteComment(postId, commentId, isAdmin);
                    updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? saved : p)));
                    SmartToast.success('تم حذف التعليق');
                } catch {
                    if (snapshot) {
                        updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? snapshot : p)));
                    }
                    SmartToast.error('تعذّر حذف التعليق');
                }
            });
        },
        [currentUserId, findPostById, isAdmin, runInflight, updatePostList],
    );

    const handleEditComment = useCallback(
        async (postId: string, commentId: string, newContent: string) => {
            if (!currentUserId) return false;
            const post = findPostById(postId);
            const comment = post?.comments.find((c) => c.id === commentId);
            if (!comment || !post || !canEditComment(comment, currentUserId, post)) {
                const lockedBest = post && post.bestCommentId === commentId;
                SmartToast.warning(
                    lockedBest
                        ? 'لا يمكن تعديل تعليق مميّز كأفضل إجابة'
                        : 'لا يمكنك تعديل هذا التعليق',
                );
                return false;
            }
            const resolved = resolveForumCommentContent(newContent);
            if (!resolved.ok) {
                SmartToast.warning(
                    resolved.reason === 'too_long' ? 'التعليق طويل جداً' : 'لا يمكن حفظ تعليق فارغ',
                );
                return false;
            }
            let savedOk = false;
            await runInflight(`comment-edit:${commentId}`, async () => {
                updatePostList(postId, (prev) =>
                    prev.map((p) => {
                        if (p.id !== postId) return p;
                        const target = p.comments.find((x) => x.id === commentId);
                        if (!target || !canEditComment(target, currentUserId, p)) return p;
                        return {
                            ...p,
                            comments: p.comments.map((item) =>
                                item.id === commentId ? { ...item, content: resolved.content } : item,
                            ),
                            updatedAt: new Date().toISOString(),
                        };
                    }),
                );
                try {
                    const saved = await ForumApiService.editComment(postId, commentId, resolved.content);
                    updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? saved : p)));
                    SmartToast.success('تم تعديل التعليق');
                    savedOk = true;
                } catch {
                    if (post) {
                        updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? post : p)));
                    }
                    SmartToast.error('تعذّر تعديل التعليق');
                }
            });
            return savedOk;
        },
        [currentUserId, findPostById, runInflight, updatePostList],
    );

    return { handleDeleteComment, handleEditComment };
}
