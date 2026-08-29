import { useForumInflightGuard } from './useForumInflightGuard';
import { useCommunityScreenPostAdmin } from './useCommunityScreenPostAdmin';
import { useCommunityScreenPostEdit } from './useCommunityScreenPostEdit';
import { useCommunityScreenPostSaves } from './useCommunityScreenPostSaves';
import type { UseCommunityScreenPostModerationParams } from './useCommunityScreenPostModeration.types';

export type { UseCommunityScreenPostModerationParams } from './useCommunityScreenPostModeration.types';

export function useCommunityScreenPostModeration(params: UseCommunityScreenPostModerationParams) {
    const { runInflight } = useForumInflightGuard();
    const admin = useCommunityScreenPostAdmin({ ...params, runInflight });
    const edit = useCommunityScreenPostEdit({ ...params, runInflight });
    const saves = useCommunityScreenPostSaves({ ...params, runInflight });

    return {
        editingPostId: edit.editingPostId,
        setEditingPostId: edit.setEditingPostId,
        editingText: edit.editingText,
        setEditingText: edit.setEditingText,
        savingEdit: edit.savingEdit,
        handleTogglePin: admin.handleTogglePin,
        handleToggleBookmark: saves.handleToggleBookmark,
        handleCopyPostText: saves.handleCopyPostText,
        handleSavePostToVault: saves.handleSavePostToVault,
        handleSavePostToDevice: saves.handleSavePostToDevice,
        handleToggleLock: admin.handleToggleLock,
        handleEditPost: edit.handleEditPost,
        handleSaveEdit: edit.handleSaveEdit,
        handleReportPost: admin.handleReportPost,
    };
}
