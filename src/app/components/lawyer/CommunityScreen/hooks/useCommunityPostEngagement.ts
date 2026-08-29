import { useCallback, useState } from 'react';
import { flushSync } from 'react-dom';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { ForumApiService } from '@/app/services/forumApiService';
import { buildCommunityPostShareUrl, setCommunityPostHash } from '../communityDeepLink';
import { canDeletePost, getPostAuthorId } from '../communityPermissions';
import type { UseCommunityPostActionsParams } from './useCommunityPostActions.types';
import { useCommunityPostUpvote } from './useCommunityPostUpvote';

export function useCommunityPostEngagement({
    lists,
    currentUserId,
    isAdmin,
    authUser,
    onPostDeleted,
}: Pick<
    UseCommunityPostActionsParams,
    'lists' | 'currentUserId' | 'isAdmin' | 'authUser' | 'onPostDeleted'
>) {
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
    const handleToggleUpvote = useCommunityPostUpvote({
        currentUserId,
        authUser,
        findPostById,
        updatePostList,
    });

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
                    err instanceof Error && err.message.trim() ? err.message : 'تعذّر حذف المنشور';
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

    return {
        handleToggleUpvote,
        handleDeletePost,
        requestDeletePost,
        confirmDeletePost,
        pendingDeletePostId,
        pendingDeletePost,
        deletingPost,
        cancelDeletePostRequest,
        handleSharePost,
    };
}
