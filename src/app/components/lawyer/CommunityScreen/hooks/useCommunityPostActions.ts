import { useCallback, useState } from 'react';
import { flushSync } from 'react-dom';

import { SmartToast } from '@/app/components/ui/SmartToast';
import type { CommunityComment, CommunityPost } from '@/app/services/lawyer-cloud';
import { ForumApiService } from '@/app/services/forumApiService';
import { publishForumComment } from '@/lib/forumService.js';
import { NotificationDB } from '@/app/services/notifications/notificationForumStorage';
import { buildCommunityPostShareUrl, setCommunityPostHash } from '../communityDeepLink';
import { checkForumRateLimit } from '../forumRateLimit';
import {
    canDeleteComment,
    canDeletePost,
    canEditComment,
    canUpvotePost,
    getPostAuthorId,
} from '../communityPermissions';
import {
    prefetchCommunityDeleteConfirmOverlay,
} from '../communityOverlayPrefetch';
import type { CommunityDualPostLists } from './useCommunityDualPostLists';

export type UseCommunityPostActionsParams = {
    lists: Pick<
        CommunityDualPostLists,
        | 'postsRef'
        | 'groupPostsRef'
        | 'setPosts'
        | 'setGroupPosts'
        | 'findPostById'
        | 'updatePostList'
        | 'removePostFromList'
    >;
    currentUserId: string | null;
    isAdmin: boolean;
    isBanned: boolean;
    authUser: { user_metadata?: { fullName?: string }; email?: string } | null;
    commentingPostId: string | null;
    onThreadSubscribed?: (postId: string) => void;
    onPostDeleted?: (postId: string) => void;
};

export function useCommunityPostActions({
    lists,
    currentUserId,
    isAdmin,
    isBanned,
    authUser,
    commentingPostId,
    onThreadSubscribed,
    onPostDeleted,
}: UseCommunityPostActionsParams) {
    const {
        postsRef,
        groupPostsRef,
        setPosts,
        setGroupPosts,
        findPostById,
        updatePostList,
        removePostFromList,
    } = lists;

    const [pendingDeletePostId, setPendingDeletePostId] = useState<string | null>(null);
    const [deletingPost, setDeletingPost] = useState(false);

    const handleToggleUpvote = useCallback(
        async (postId: string) => {
            if (!currentUserId) {
                SmartToast.warning('سجّل الدخول للتصويت');
                return;
            }
            const target = findPostById(postId);
            if (!target || !canUpvotePost(target, currentUserId)) {
                SmartToast.warning('لا يمكنك التصويت على منشورك');
                return;
            }
            const snapshot = target;
            let nextPost: CommunityPost | null = null;
            let wasUpvote = false;
            let targetUserId = '';
            flushSync(() => {
                updatePostList(postId, (prev) =>
                    prev.map((p) => {
                        if (p.id !== postId) return p;
                        const has = p.upvoterIds.includes(currentUserId);
                        const upvoterIds = has
                            ? p.upvoterIds.filter((x) => x !== currentUserId)
                            : [...p.upvoterIds, currentUserId];
                        wasUpvote = !has;
                        targetUserId = getPostAuthorId(p);
                        nextPost = { ...p, upvoterIds, updatedAt: new Date().toISOString() };
                        return nextPost;
                    }),
                );
            });
            if (!nextPost) return;
            try {
                await ForumApiService.syncPost(nextPost);
            } catch {
                updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? snapshot : p)));
                SmartToast.warning('تعذّر حفظ التصويت');
                return;
            }
            if (wasUpvote && targetUserId && targetUserId !== currentUserId && authUser) {
                void NotificationDB.addNotification({
                    id: crypto.randomUUID(),
                    userId: targetUserId,
                    type: 'upvote',
                    title: 'إعجاب بمنشورك',
                    message: `أعجب ${authUser?.user_metadata?.fullName || 'أحد المستخدمين'} بمنشورك`,
                    postId,
                    read: false,
                    createdAt: new Date().toISOString(),
                }).catch(() => undefined);
            }
        },
        [authUser, currentUserId, findPostById, updatePostList],
    );

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
            const rate = checkForumRateLimit('comment', currentUserId);
            if ('retryAfterSec' in rate) {
                SmartToast.warning(`انتظر ${rate.retryAfterSec} ثانية قبل تعليق جديد`);
                return false;
            }
            const commentId =
                typeof crypto !== 'undefined' && 'randomUUID' in crypto
                    ? crypto.randomUUID()
                    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            const newComment: CommunityComment = {
                id: commentId,
                postId,
                authorId: currentUserId,
                authorName: authUser?.user_metadata?.fullName || authUser?.email || 'محامي',
                content,
                createdAt: new Date().toISOString(),
                parentId,
            };
            let nextPost: CommunityPost | null = null;
            updatePostList(postId, (prev) =>
                prev.map((p) => {
                    if (p.id !== postId) return p;
                    nextPost = {
                        ...p,
                        comments: [...p.comments, newComment],
                        updatedAt: new Date().toISOString(),
                    };
                    return nextPost;
                }),
            );
            try {
                const saved = await publishForumComment(postId, newComment);
                updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? saved : p)));
                onThreadSubscribed?.(postId);
                SmartToast.success('تم نشر التعليق');
                return true;
            } catch {
                updatePostList(postId, (prev) =>
                    prev.map((p) => {
                        if (p.id !== postId) return p;
                        return { ...p, comments: p.comments.filter((c) => c.id !== commentId) };
                    }),
                );
                SmartToast.error('تعذّر نشر التعليق');
                return false;
            }
        },
        [authUser, currentUserId, isBanned, onThreadSubscribed, updatePostList],
    );

    const handleDeleteComment = useCallback(
        async (postId: string, commentId: string) => {
            if (!currentUserId) return;
            const post = findPostById(postId);
            const comment = post?.comments.find((c) => c.id === commentId);
            if (!post || !comment || !canDeleteComment(post, comment, currentUserId, isAdmin)) {
                SmartToast.warning('لا يمكنك حذف هذا التعليق');
                return;
            }
            const snapshot = findPostById(postId);
            updatePostList(postId, (prev) =>
                prev.map((p) => {
                    if (p.id !== postId) return p;
                    const c = p.comments.find((x) => x.id === commentId);
                    if (!c || !canDeleteComment(p, c, currentUserId, isAdmin)) return p;
                    return {
                        ...p,
                        comments: p.comments.filter(
                            (c) => c.id !== commentId && c.parentId !== commentId,
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
        },
        [currentUserId, findPostById, isAdmin, updatePostList],
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
            let nextPost: CommunityPost | null = null;
            updatePostList(postId, (prev) =>
                prev.map((p) => {
                    if (p.id !== postId) return p;
                    const c = p.comments.find((x) => x.id === commentId);
                    if (!c || !canEditComment(c, currentUserId, p)) return p;
                    nextPost = {
                        ...p,
                        comments: p.comments.map((c) =>
                            c.id === commentId ? { ...c, content: newContent } : c,
                        ),
                        updatedAt: new Date().toISOString(),
                    };
                    return nextPost;
                }),
            );
            try {
                const saved = await ForumApiService.editComment(postId, commentId, newContent);
                updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? saved : p)));
                SmartToast.success('تم تعديل التعليق');
                return true;
            } catch {
                if (post) {
                    updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? post : p)));
                }
                SmartToast.error('تعذّر تعديل التعليق');
                return false;
            }
        },
        [currentUserId, findPostById, updatePostList],
    );

    const handleDeletePost = useCallback(
        async (postId: string) => {
            if (!currentUserId) return;
            const post = findPostById(postId);
            if (!post || !canDeletePost(post, currentUserId, isAdmin)) {
                SmartToast.warning('لا يمكنك حذف هذا المنشور');
                return;
            }
            const snapshotPosts = postsRef.current;
            const snapshotGroupPosts = groupPostsRef.current;
            removePostFromList(postId);
            onPostDeleted?.(postId);
            SmartToast.success('تم حذف المنشور');
            try {
                await ForumApiService.deletePost(
                    postId,
                    getPostAuthorId(post),
                    isAdmin,
                    currentUserId,
                );
            } catch (err) {
                setPosts(snapshotPosts);
                setGroupPosts(snapshotGroupPosts);
                const message =
                    err instanceof Error && err.message.trim()
                        ? err.message
                        : 'تعذّر حذف المنشور';
                SmartToast.error(message);
                throw err;
            }
        },
        [
            currentUserId,
            findPostById,
            groupPostsRef,
            isAdmin,
            postsRef,
            removePostFromList,
            setGroupPosts,
            setPosts,
            onPostDeleted,
        ],
    );

    const requestDeletePost = useCallback(
        (postId: string) => {
            if (!currentUserId) return;
            const post = findPostById(postId);
            if (!post || !canDeletePost(post, currentUserId, isAdmin)) {
                SmartToast.warning('لا يمكنك حذف هذا المنشور');
                return;
            }
            prefetchCommunityDeleteConfirmOverlay();
            setPendingDeletePostId(postId);
        },
        [currentUserId, findPostById, isAdmin],
    );

    const confirmDeletePost = useCallback(async () => {
        if (!pendingDeletePostId || deletingPost) return;
        const postId = pendingDeletePostId;
        flushSync(() => {
            setPendingDeletePostId(null);
            setDeletingPost(true);
        });
        try {
            await handleDeletePost(postId);
        } catch {
            /* toast + rollback داخل handleDeletePost */
        } finally {
            setDeletingPost(false);
        }
    }, [deletingPost, handleDeletePost, pendingDeletePostId]);

    const pendingDeletePost = pendingDeletePostId ? findPostById(pendingDeletePostId) : null;

    const cancelDeletePostRequest = useCallback(() => {
        setPendingDeletePostId(null);
    }, []);

    const handleSharePost = useCallback(async (postId: string) => {
        const url = buildCommunityPostShareUrl(postId);
        setCommunityPostHash(postId);
        try {
            await navigator.clipboard.writeText(url);
            SmartToast.success('تم نسخ الرابط');
        } catch {
            SmartToast.warning('تعذّر نسخ الرابط');
        }
    }, []);

    const handleToggleBestAnswer = useCallback(
        async (postId: string, commentId: string) => {
            if (!currentUserId) return;
            const post = findPostById(postId);
            if (!post) return;
            if (getPostAuthorId(post) !== currentUserId) {
                SmartToast.warning('فقط صاحب المنشور يمكنه تمييز أفضل إجابة');
                return;
            }
            const nextBest = (post.bestCommentId ?? null) === commentId ? null : commentId;
            let nextPost: CommunityPost | null = null;
            updatePostList(postId, (prev) =>
                prev.map((p) => {
                    if (p.id !== postId) return p;
                    nextPost = { ...p, bestCommentId: nextBest, updatedAt: new Date().toISOString() };
                    return nextPost;
                }),
            );
            if (nextPost) {
                try {
                    const saved = await ForumApiService.syncPost(nextPost);
                    updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? saved : p)));
                } catch {
                    SmartToast.error('تعذّر تحديث أفضل إجابة');
                }
            }
            if (nextBest && getPostAuthorId(post) !== currentUserId) {
                const bestComment = post.comments.find((c) => c.id === commentId);
                if (bestComment) {
                    void NotificationDB.addNotification({
                        id: crypto.randomUUID(),
                        userId: bestComment.authorId,
                        type: 'best_answer',
                        title: 'تم تمييز إجابتك كأفضل إجابة',
                        message: `اختار ${post.authorName} إجابتك كأفضل إجابة على منشور "${post.content.slice(0, 50)}..."`,
                        postId,
                        read: false,
                        createdAt: new Date().toISOString(),
                    }).catch(() => undefined);
                }
            }
        },
        [currentUserId, findPostById, updatePostList],
    );

    const handleToggleCommentUpvote = useCallback(
        async (commentId: string) => {
            if (!currentUserId || !commentingPostId) return;
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
        },
        [commentingPostId, currentUserId, updatePostList],
    );

    const handleReportComment = useCallback(
        async (commentId: string) => {
            if (!currentUserId) {
                SmartToast.warning('سجّل الدخول للإبلاغ');
                return;
            }
            try {
                const r = await ForumApiService.reportComment(commentId, 'محتوى مخالف');
                if (r.duplicate) SmartToast.info('أبلغت عن هذا التعليق مسبقاً');
                else if (r.ok) SmartToast.success('تم رفع البلاغ');
                else SmartToast.error('تعذّر إرسال البلاغ');
            } catch {
                SmartToast.error('تعذّر إرسال البلاغ');
            }
        },
        [currentUserId],
    );

    return {
        handleToggleUpvote,
        handleAddComment,
        handleDeleteComment,
        handleEditComment,
        handleDeletePost,
        requestDeletePost,
        confirmDeletePost,
        pendingDeletePostId,
        pendingDeletePost,
        deletingPost,
        cancelDeletePostRequest,
        handleSharePost,
        handleToggleBestAnswer,
        handleToggleCommentUpvote,
        handleReportComment,
    };
}
