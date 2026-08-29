import { useCallback } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { ForumApiService } from '@/app/services/forumApiService';
import { NotificationDB } from '@/app/services/notifications/notificationForumStorage';
import { checkForumRateLimit, peekForumRateLimit } from '../forumRateLimit';
import { getCommentAuthorId, getPostAuthorId } from '../communityPermissions';
import type { UseCommunityPostActionsParams } from './useCommunityPostActions.types';

type CommentSignalsParams = Omit<UseCommunityPostActionsParams, 'onPostDeleted' | 'isBanned' | 'authUser' | 'isAdmin'> & {
    runInflight: (key: string, action: () => Promise<void>) => Promise<void>;
};

export function useCommunityPostCommentSignals({
    lists,
    currentUserId,
    commentingPostId,
    runInflight,
}: CommentSignalsParams) {
    const { findPostById, updatePostList } = lists;

    const handleToggleBestAnswer = useCallback(
        async (postId: string, commentId: string) => {
            if (!currentUserId) return;
            const post = findPostById(postId);
            if (!post) return;
            if (getPostAuthorId(post) !== currentUserId) {
                SmartToast.warning('فقط صاحب المنشور يمكنه تمييز أفضل إجابة');
                return;
            }
            await runInflight(`best:${postId}:${commentId}`, async () => {
                const nextBest = (post.bestCommentId ?? null) === commentId ? null : commentId;
                let nextPost: CommunityPost | null = null;
                updatePostList(postId, (prev) =>
                    prev.map((p) => {
                        if (p.id !== postId) return p;
                        nextPost = {
                            ...p,
                            bestCommentId: nextBest,
                            updatedAt: new Date().toISOString(),
                        };
                        return nextPost;
                    }),
                );
                if (!nextPost) return;
                try {
                    const saved = await ForumApiService.syncPost(nextPost);
                    updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? saved : p)));
                } catch {
                    updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? post : p)));
                    SmartToast.error('تعذّر تحديث أفضل إجابة');
                    return;
                }
                if (!nextBest) return;
                const bestComment = post.comments.find((c) => c.id === commentId);
                const commentAuthorId = bestComment ? getCommentAuthorId(bestComment) : '';
                if (!bestComment || !commentAuthorId || commentAuthorId === currentUserId) return;
                void NotificationDB.addNotification({
                    id: crypto.randomUUID(),
                    userId: commentAuthorId,
                    type: 'best_answer',
                    title: 'تم تمييز إجابتك كأفضل إجابة',
                    message: `اختار ${post.authorName} إجابتك كأفضل إجابة على منشور "${post.content.slice(0, 50)}..."`,
                    postId,
                    read: false,
                    createdAt: new Date().toISOString(),
                }).catch(() => undefined);
            });
        },
        [currentUserId, findPostById, runInflight, updatePostList],
    );

    const handleToggleCommentUpvote = useCallback(
        async (commentId: string) => {
            if (!currentUserId || !commentingPostId) return;
            await runInflight(`comment-up:${commentId}`, async () => {
                let didOptimisticUpdate = false;
                updatePostList(commentingPostId, (prev) =>
                    prev.map((p) => {
                        if (p.id !== commentingPostId) return p;
                        return {
                            ...p,
                            comments: p.comments.map((c) => {
                                if (c.id !== commentId) return c;
                                const set = new Set(c.upvoterIds ?? []);
                                if (set.has(currentUserId)) set.delete(currentUserId);
                                else set.add(currentUserId);
                                didOptimisticUpdate = true;
                                return { ...c, upvoterIds: [...set] };
                            }),
                        };
                    }),
                );
                try {
                    const { upvoterIds } = await ForumApiService.toggleCommentUpvote(commentId);
                    updatePostList(commentingPostId, (prev) =>
                        prev.map((p) => {
                            if (p.id !== commentingPostId) return p;
                            return {
                                ...p,
                                comments: p.comments.map((c) =>
                                    c.id === commentId ? { ...c, upvoterIds } : c,
                                ),
                            };
                        }),
                    );
                } catch {
                    if (didOptimisticUpdate) {
                        updatePostList(commentingPostId, (prev) =>
                            prev.map((p) => {
                                if (p.id !== commentingPostId) return p;
                                return {
                                    ...p,
                                    comments: p.comments.map((c) => {
                                        if (c.id !== commentId) return c;
                                        const set = new Set(c.upvoterIds ?? []);
                                        if (set.has(currentUserId)) set.delete(currentUserId);
                                        else set.add(currentUserId);
                                        return { ...c, upvoterIds: [...set] };
                                    }),
                                };
                            }),
                        );
                    }
                    SmartToast.warning('تعذّر تسجيل الإعجاب');
                }
            });
        },
        [commentingPostId, currentUserId, runInflight, updatePostList],
    );

    const handleReportComment = useCallback(
        async (commentId: string) => {
            if (!currentUserId) {
                SmartToast.warning('سجّل الدخول للإبلاغ');
                return;
            }
            await runInflight(`report-comment:${commentId}`, async () => {
                const peeked = peekForumRateLimit('report', currentUserId, { postId: `comment:${commentId}` });
                if (!peeked.allowed) {
                    SmartToast.info('أبلغت عن هذا التعليق مسبقاً');
                    return;
                }
                try {
                    const result = await ForumApiService.reportComment(commentId, 'محتوى مخالف');
                    if (result.duplicate) {
                        checkForumRateLimit('report', currentUserId, { postId: `comment:${commentId}` });
                        SmartToast.info('أبلغت عن هذا التعليق مسبقاً');
                        return;
                    }
                    if (result.ok) {
                        checkForumRateLimit('report', currentUserId, { postId: `comment:${commentId}` });
                        SmartToast.success('تم رفع البلاغ');
                    } else {
                        SmartToast.error('تعذّر إرسال البلاغ');
                    }
                } catch {
                    SmartToast.error('تعذّر إرسال البلاغ');
                }
            });
        },
        [currentUserId, runInflight],
    );

    return {
        handleToggleBestAnswer,
        handleToggleCommentUpvote,
        handleReportComment,
    };
}
