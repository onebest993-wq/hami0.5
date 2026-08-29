import { useCallback, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { ForumApiService } from '@/app/services/forumApiService';
import { buildForumEditPatch } from '@/app/services/forum/forumEditUtils';
import { canEditPost } from '../communityPermissions';
import { prefetchCommunityEditPostOverlay } from '../communityOverlayPrefetch';
import type { UseCommunityScreenPostModerationParams } from './useCommunityScreenPostModeration.types';

type UseCommunityScreenPostEditParams = Pick<
    UseCommunityScreenPostModerationParams,
    'currentUserId' | 'isAdmin' | 'findPostById' | 'updatePostList'
> & {
    runInflight: (key: string, action: () => Promise<void>) => Promise<void>;
};

export function useCommunityScreenPostEdit({
    currentUserId,
    isAdmin,
    findPostById,
    updatePostList,
    runInflight,
}: UseCommunityScreenPostEditParams) {
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);

    const handleEditPost = useCallback(
        (postId: string) => {
            const post = findPostById(postId);
            if (!post || !canEditPost(post, currentUserId, isAdmin)) {
                SmartToast.warning('لا يمكنك تعديل هذا المنشور');
                return;
            }
            setEditingPostId(postId);
            setEditingText(post.content);
            prefetchCommunityEditPostOverlay();
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
        await runInflight(`edit:${targetId}`, async () => {
            const snapshot = findPostById(targetId);
            const editPatch = snapshot ? buildForumEditPatch(snapshot, nextText) : null;
            updatePostList(targetId, (prev) =>
                prev.map((p) => (p.id === targetId && editPatch ? { ...p, ...editPatch } : p)),
            );
            setEditingPostId(null);
            setEditingText('');
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
            } catch (err) {
                if (snapshot) {
                    updatePostList(targetId, (prev) => prev.map((p) => (p.id === targetId ? snapshot : p)));
                }
                const message = err instanceof Error && err.message.trim() ? err.message : 'تعذّر تحديث المنشور';
                SmartToast.error(message);
            } finally {
                setSavingEdit(false);
            }
        });
    }, [currentUserId, editingPostId, editingText, findPostById, runInflight, updatePostList]);

    return {
        editingPostId,
        setEditingPostId,
        editingText,
        setEditingText,
        savingEdit,
        handleEditPost,
        handleSaveEdit,
    };
}
