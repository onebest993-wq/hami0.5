import { useCallback } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { ForumApiService } from '@/app/services/forumApiService';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { saveForumAttachmentToVault } from '@/app/services/forum/forumPostPersistActions';
import { resolveCommunityAttachmentUrl } from '@/app/services/forumAttachmentService';
import { downloadRepositoryFile } from '../repositoryStorageService';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import { getForumSessionUserId } from '@/app/services/forum/forumApi/forumApiClientCore';
import { copyTextWithFallback } from '../forumClipboardCopy';
import type { UseCommunityScreenPostModerationParams } from './useCommunityScreenPostModeration.types';

type UseCommunityScreenPostSavesParams = Pick<
    UseCommunityScreenPostModerationParams,
    'currentUserId' | 'authUser' | 'persistedUser' | 'findPostById' | 'bookmarkedIds' | 'setBookmarkedIds'
> & {
    runInflight: (key: string, action: () => Promise<void>) => Promise<void>;
};

export function useCommunityScreenPostSaves({
    currentUserId,
    authUser,
    persistedUser,
    findPostById,
    bookmarkedIds,
    setBookmarkedIds,
    runInflight,
}: UseCommunityScreenPostSavesParams) {
    const handleToggleBookmark = useCallback(
        async (postId: string) => {
            if (!currentUserId) {
                SmartToast.warning('سجّل الدخول لحفظ المنشور');
                return;
            }
            await runInflight(`bookmark:${postId}`, async () => {
                const wasBookmarked = bookmarkedIds.has(postId);
                setBookmarkedIds((prev) => {
                    const next = new Set(prev);
                    if (wasBookmarked) next.delete(postId);
                    else next.add(postId);
                    return next;
                });
                SmartToast.success(wasBookmarked ? 'تم إلغاء الحفظ' : 'تم حفظ المنشور');
                try {
                    const bookmarked = await ForumApiService.toggleBookmark(postId, currentUserId);
                    setBookmarkedIds((prev) => {
                        const next = new Set(prev);
                        if (bookmarked) next.add(postId);
                        else next.delete(postId);
                        return next;
                    });
                } catch {
                    setBookmarkedIds((prev) => {
                        const next = new Set(prev);
                        if (wasBookmarked) next.add(postId);
                        else next.delete(postId);
                        return next;
                    });
                    SmartToast.error('تعذّر تحديث حالة الحفظ');
                }
            });
        },
        [bookmarkedIds, currentUserId, runInflight, setBookmarkedIds],
    );

    const handleCopyPostText = useCallback(
        async (postId: string) => {
            const post = findPostById(postId);
            if (!post) return;
            try {
                const copied = await copyTextWithFallback(post.content);
                if (!copied) throw new Error('copy-failed');
                SmartToast.success('تم نسخ نص المنشور');
            } catch {
                SmartToast.error('تعذّر نسخ النص');
            }
        },
        [findPostById],
    );

    const handleSavePostToVault = useCallback(
        async (postId: string) => {
            const sessionUserId = await getForumSessionUserId();
            const targetUserId =
                sessionUserId?.trim() ||
                (authUser && 'id' in authUser && typeof authUser.id === 'string' && authUser.id.trim()
                    ? authUser.id.trim()
                    : persistedUser?.id?.trim() ||
                      (currentUserId && isRealSignedIn(currentUserId) ? currentUserId : null));
            if (!targetUserId) {
                SmartToast.warning('سجّل الدخول للحفظ في المستودع الذكي');
                return;
            }
            await runInflight(`vault:${postId}`, async () => {
                const post = findPostById(postId);
                if (!post?.attachment) {
                    SmartToast.info('لا يوجد مرفق لحفظه');
                    return;
                }
                const authorName =
                    authUser?.user_metadata?.fullName ||
                    authUser?.email ||
                    persistedUser?.email ||
                    'محامي';
                try {
                    await saveForumAttachmentToVault(post, targetUserId, String(authorName));
                    SmartToast.success('تم حفظ المرفق في المستودع الذكي');
                } catch {
                    SmartToast.error('تعذّر حفظ المرفق في المستودع الذكي');
                }
            });
        },
        [authUser, currentUserId, findPostById, persistedUser?.email, persistedUser?.id, runInflight],
    );

    const handleSavePostToDevice = useCallback(
        async (postId: string) => {
            await runInflight(`save-device:${postId}`, async () => {
                const post = findPostById(postId);
                if (!post?.attachment) {
                    SmartToast.info('لا يوجد مرفق لحفظه');
                    return;
                }
                try {
                    const url = await resolveCommunityAttachmentUrl(post.attachment);
                    if (!url) {
                        SmartToast.warning('الملف غير متاح للحفظ حالياً');
                        return;
                    }
                    const fileName = post.attachment.name?.trim() || `forum-${post.id}`;
                    await downloadRepositoryFile(url, fileName);
                    SmartToast.success('تم حفظ الملف في الجهاز');
                } catch {
                    SmartToast.error('تعذّر حفظ الملف في الجهاز');
                }
            });
        },
        [findPostById, runInflight],
    );

    return {
        handleToggleBookmark,
        handleCopyPostText,
        handleSavePostToVault,
        handleSavePostToDevice,
    };
}
