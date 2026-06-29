import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { ForumApiService } from '@/app/services/forumApiService';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { checkForumRateLimit } from '../forumRateLimit';
import {
    saveForumAttachmentToVault,
    saveForumPostToNotepad,
} from '@/app/services/forum/forumPostPersistActions';
import { buildForumEditPatch } from '@/app/services/forum/forumEditUtils';
import { canEditPost, canPinPost } from '../communityPermissions';

export type UseCommunityScreenPostModerationParams = {
    currentUserId: string | null;
    isAdmin: boolean;
    authUser: { user_metadata?: { fullName?: string }; email?: string | null } | null;
    persistedUser: { email?: string | null } | null;
    findPostById: (postId: string) => CommunityPost | undefined;
    updatePostList: (postId: string, updater: (prev: CommunityPost[]) => CommunityPost[]) => void;
    bookmarkedIds: Set<string>;
    setBookmarkedIds: Dispatch<SetStateAction<Set<string>>>;
};

export function useCommunityScreenPostModeration({
    currentUserId,
    isAdmin,
    authUser,
    persistedUser,
    findPostById,
    updatePostList,
    bookmarkedIds,
    setBookmarkedIds,
}: UseCommunityScreenPostModerationParams) {
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);

    const handleTogglePin = useCallback(
        async (postId: string) => {
            if (!canPinPost(isAdmin)) {
                SmartToast.warning('التثبيت متاح للإدارة فقط');
                return;
            }
            const post = findPostById(postId);
            if (!post) return;
            const nextPinned = !post.isPinned;
            try {
                const updated = await ForumApiService.togglePin(postId, nextPinned);
                updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? updated : p)));
                SmartToast.success(nextPinned ? 'تم تثبيت المنشور' : 'تم إلغاء تثبيت المنشور');
            } catch {
                SmartToast.error('تعذّر تحديث حالة التثبيت');
            }
        },
        [findPostById, isAdmin, updatePostList],
    );

    const handleToggleBookmark = useCallback(
        async (postId: string) => {
            if (!currentUserId) {
                SmartToast.warning('سجّل الدخول لحفظ المنشور');
                return;
            }
            const wasBookmarked = bookmarkedIds.has(postId);
            setBookmarkedIds((prev) => {
                const next = new Set(prev);
                if (wasBookmarked) next.delete(postId);
                else next.add(postId);
                return next;
            });
            try {
                const bookmarked = await ForumApiService.toggleBookmark(postId, currentUserId);
                setBookmarkedIds((prev) => {
                    const next = new Set(prev);
                    if (bookmarked) next.add(postId);
                    else next.delete(postId);
                    return next;
                });
                SmartToast.success(bookmarked ? 'تم حفظ المنشور' : 'تم إلغاء الحفظ');
            } catch {
                setBookmarkedIds((prev) => {
                    const next = new Set(prev);
                    if (wasBookmarked) next.add(postId);
                    else next.delete(postId);
                    return next;
                });
                SmartToast.error('تعذّر تحديث حالة الحفظ');
            }
        },
        [bookmarkedIds, currentUserId, setBookmarkedIds],
    );

    const handleSavePostToNotes = useCallback(
        async (postId: string) => {
            const post = findPostById(postId);
            if (!post) return;
            try {
                await saveForumPostToNotepad(post);
                SmartToast.success('تم حفظ المنشور في الملاحظات');
            } catch {
                SmartToast.error('تعذّر حفظ المنشور في الملاحظات');
            }
        },
        [findPostById],
    );

    const handleSavePostToVault = useCallback(
        async (postId: string) => {
            if (!currentUserId) {
                SmartToast.warning('سجّل الدخول لحفظ الملف في المخزن');
                return;
            }
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
                await saveForumAttachmentToVault(post, currentUserId, String(authorName));
                SmartToast.success('تم حفظ المرفق في المخزن');
            } catch {
                SmartToast.error('تعذّر حفظ المرفق في المخزن');
            }
        },
        [authUser, currentUserId, findPostById, persistedUser?.email],
    );

    const handleToggleLock = useCallback(
        async (postId: string) => {
            if (!currentUserId) return;
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
            try {
                const updated = await ForumApiService.toggleLockDiscussion(
                    postId,
                    nextLocked,
                    currentUserId,
                    isAdmin,
                    post.author_id ?? post.authorId,
                );
                updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? updated : p)));
                SmartToast.success(nextLocked ? 'تم قفل النقاش' : 'تم فتح النقاش');
            } catch (err) {
                updatePostList(postId, (prev) =>
                    prev.map((p) => (p.id === postId ? { ...p, isLocked: snapshot || undefined } : p)),
                );
                const message =
                    err instanceof Error && err.message.trim() ? err.message : 'تعذّر تحديث حالة القفل';
                SmartToast.error(message);
            }
        },
        [currentUserId, findPostById, isAdmin, updatePostList],
    );

    const handleEditPost = useCallback(
        (postId: string) => {
            const post = findPostById(postId);
            if (!post || !canEditPost(post, currentUserId, isAdmin)) {
                SmartToast.warning('لا يمكنك تعديل هذا المنشور');
                return;
            }
            setEditingPostId(postId);
            setEditingText(post.content);
        },
        [currentUserId, findPostById, isAdmin],
    );

    const handleSaveEdit = useCallback(async () => {
        if (!editingPostId) return;
        const nextText = editingText.trim();
        if (nextText.length < 5) {
            SmartToast.warning('النص قصير جداً');
            return;
        }
        if (nextText.length > 10_000) {
            SmartToast.warning('النص طويل جداً (الحد 10000 حرف)');
            return;
        }
        const targetId = editingPostId;
        const snapshot = findPostById(targetId);
        const editPatch = snapshot ? buildForumEditPatch(snapshot, nextText) : null;
        updatePostList(targetId, (prev) =>
            prev.map((p) => (p.id === targetId && editPatch ? { ...p, ...editPatch } : p)),
        );
        setSavingEdit(true);
        try {
            const updated = await ForumApiService.updatePost(targetId, nextText, currentUserId);
            const reconciled =
                updated.content.trim() === nextText
                    ? updated
                    : editPatch
                      ? { ...updated, ...editPatch }
                      : {
                            ...updated,
                            content: nextText,
                            isEdited: true,
                            updatedAt: new Date().toISOString(),
                        };
            updatePostList(targetId, (prev) => prev.map((p) => (p.id === targetId ? reconciled : p)));
            SmartToast.success('تم تحديث المنشور');
            setEditingPostId(null);
            setEditingText('');
        } catch (err) {
            if (snapshot) {
                updatePostList(targetId, (prev) => prev.map((p) => (p.id === targetId ? snapshot : p)));
            }
            const message = err instanceof Error && err.message.trim() ? err.message : 'تعذّر تحديث المنشور';
            SmartToast.error(message);
        } finally {
            setSavingEdit(false);
        }
    }, [currentUserId, editingPostId, editingText, findPostById, updatePostList]);

    const handleReportPost = useCallback(
        async (postId: string) => {
            if (!currentUserId) {
                SmartToast.warning('سجّل الدخول للإبلاغ');
                return;
            }
            const reportRate = checkForumRateLimit('report', currentUserId, { postId });
            if (!reportRate.allowed) {
                SmartToast.warning('لقد أبلغت عن هذا المنشور مسبقاً أو انتظر قليلاً');
                return;
            }
            try {
                const result = await ForumApiService.reportPost(postId, 'محتوى مخالف');
                if (result.duplicate) {
                    SmartToast.info('لقد أبلغت عن هذا المنشور مسبقاً');
                    return;
                }
                if (result.ok) {
                    SmartToast.success('تم رفع البلاغ للإدارة');
                } else {
                    SmartToast.error('تعذّر إرسال البلاغ');
                }
            } catch {
                SmartToast.error('تعذّر إرسال البلاغ');
            }
        },
        [currentUserId],
    );

    return {
        editingPostId,
        setEditingPostId,
        editingText,
        setEditingText,
        savingEdit,
        handleTogglePin,
        handleToggleBookmark,
        handleSavePostToNotes,
        handleSavePostToVault,
        handleToggleLock,
        handleEditPost,
        handleSaveEdit,
        handleReportPost,
    };
}
