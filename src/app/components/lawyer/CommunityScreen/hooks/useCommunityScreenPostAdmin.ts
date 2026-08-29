import { useCallback } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { ForumApiService } from '@/app/services/forumApiService';
import { checkForumRateLimit, peekForumRateLimit } from '../forumRateLimit';
import { canPinPost } from '../communityPermissions';
import type { UseCommunityScreenPostModerationParams } from './useCommunityScreenPostModeration.types';

type UseCommunityScreenPostAdminParams = Pick<
    UseCommunityScreenPostModerationParams,
    'currentUserId' | 'isAdmin' | 'findPostById' | 'updatePostList'
> & {
    runInflight: (key: string, action: () => Promise<void>) => Promise<void>;
};

export function useCommunityScreenPostAdmin({
    currentUserId,
    isAdmin,
    findPostById,
    updatePostList,
    runInflight,
}: UseCommunityScreenPostAdminParams) {
    const handleTogglePin = useCallback(
        async (postId: string) => {
            if (!canPinPost(isAdmin)) {
                SmartToast.warning('التثبيت متاح للإدارة فقط');
                return;
            }
            await runInflight(`pin:${postId}`, async () => {
                const post = findPostById(postId);
                if (!post) return;
                const nextPinned = !post.isPinned;
                updatePostList(postId, (prev) =>
                    prev.map((p) =>
                        p.id === postId
                            ? {
                                  ...p,
                                  isPinned: nextPinned || undefined,
                                  updatedAt: new Date().toISOString(),
                              }
                            : p,
                    ),
                );
                SmartToast.success(nextPinned ? 'تم تثبيت المنشور' : 'تم إلغاء تثبيت المنشور');
                try {
                    const updated = await ForumApiService.togglePin(postId, nextPinned);
                    updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? updated : p)));
                } catch {
                    updatePostList(postId, (prev) =>
                        prev.map((p) =>
                            p.id === postId
                                ? { ...p, isPinned: post.isPinned || undefined, updatedAt: post.updatedAt }
                                : p,
                        ),
                    );
                    SmartToast.error('تعذّر تحديث حالة التثبيت');
                }
            });
        },
        [findPostById, isAdmin, runInflight, updatePostList],
    );

    const handleToggleLock = useCallback(
        async (postId: string) => {
            if (!currentUserId) return;
            await runInflight(`lock:${postId}`, async () => {
                const post = findPostById(postId);
                if (!post) return;
                if (post.authorId !== currentUserId && !isAdmin) {
                    SmartToast.warning('قفل النقاش متاح لصاحب المنشور أو الإدارة');
                    return;
                }
                const nextLocked = !post.isLocked;
                const snapshot = post.isLocked;
                updatePostList(postId, (prev) =>
                    prev.map((p) =>
                        p.id === postId
                            ? { ...p, isLocked: nextLocked || undefined, updatedAt: new Date().toISOString() }
                            : p,
                    ),
                );
                SmartToast.success(nextLocked ? 'تم قفل النقاش' : 'تم فتح النقاش');
                try {
                    const updated = await ForumApiService.toggleLockDiscussion(
                        postId,
                        nextLocked,
                        currentUserId,
                        isAdmin,
                        post.author_id ?? post.authorId,
                    );
                    updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? updated : p)));
                } catch (err) {
                    updatePostList(postId, (prev) =>
                        prev.map((p) => (p.id === postId ? { ...p, isLocked: snapshot || undefined } : p)),
                    );
                    const message =
                        err instanceof Error && err.message.trim() ? err.message : 'تعذّر تحديث حالة القفل';
                    SmartToast.error(message);
                }
            });
        },
        [currentUserId, findPostById, isAdmin, runInflight, updatePostList],
    );

    const handleReportPost = useCallback(
        async (postId: string) => {
            if (!currentUserId) {
                SmartToast.warning('سجّل الدخول للإبلاغ');
                return;
            }
            await runInflight(`report:${postId}`, async () => {
                const peeked = peekForumRateLimit('report', currentUserId, { postId });
                if (!peeked.allowed) {
                    SmartToast.warning('لقد أبلغت عن هذا المنشور مسبقاً أو انتظر قليلاً');
                    return;
                }
                try {
                    const result = await ForumApiService.reportPost(postId, 'محتوى مخالف');
                    if (result.duplicate) {
                        checkForumRateLimit('report', currentUserId, { postId });
                        SmartToast.info('لقد أبلغت عن هذا المنشور مسبقاً');
                        return;
                    }
                    if (result.ok) {
                        checkForumRateLimit('report', currentUserId, { postId });
                        SmartToast.success('تم رفع البلاغ للإدارة');
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
        handleTogglePin,
        handleToggleLock,
        handleReportPost,
    };
}
