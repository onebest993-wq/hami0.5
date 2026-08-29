import { useCallback } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { ForumApiService } from '@/app/services/forumApiService';
import { NotificationDB } from '@/app/services/notifications/notificationForumStorage';
import { flushSync } from 'react-dom';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { canUpvotePost, getPostAuthorId } from '../communityPermissions';
import type { UseCommunityPostActionsParams } from './useCommunityPostActions.types';

export function useCommunityPostUpvote({
    currentUserId,
    authUser,
    findPostById,
    updatePostList,
}: Pick<UseCommunityPostActionsParams, 'currentUserId' | 'authUser'> & {
    findPostById: (postId: string) => CommunityPost | null;
    updatePostList: UseCommunityPostActionsParams['lists']['updatePostList'];
}) {
    return useCallback(
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
}
