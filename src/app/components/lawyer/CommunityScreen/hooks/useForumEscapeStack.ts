import { useEffect } from 'react';
import { releaseBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { resolveForumEscapeAction } from '@/app/components/lawyer/CommunityScreen/forumEscapeStack';

export type UseForumEscapeStackParams = {
    fullscreenImage: string | null;
    profileView: boolean;
    pendingDeletePostId: string | null;
    editingPostId: string | null;
    isCreateGroupOpen: boolean;
    commentingPostId: string | null;
    isAddQuestionOpen: boolean;
    isSearchOpen: boolean;
    showFollowingPanel: boolean;
    activeGroupId: string | null;
    forumAppBarDropdownOpen: boolean;
    onBack?: () => void;
    onCloseFullscreenImage: () => void;
    onCloseProfile: () => void;
    onCancelDelete: () => void;
    onCancelEdit: () => void;
    onCloseCreateGroup: () => void;
    onCloseComments: () => void;
    onCloseAddQuestion: () => void;
    onCloseSearch: () => void;
    onCloseFollowingPanel: () => void;
    onCloseAppBarDropdowns: () => void;
    onLeaveGroupFeed: () => void;
};

/** Escape يغلق الطبقة الداخلية ثم يخرج من المنتدى */
export function useForumEscapeStack(params: UseForumEscapeStackParams): void {
    const {
        fullscreenImage,
        profileView,
        pendingDeletePostId,
        editingPostId,
        isCreateGroupOpen,
        commentingPostId,
        isAddQuestionOpen,
        isSearchOpen,
        showFollowingPanel,
        activeGroupId,
        forumAppBarDropdownOpen,
        onBack,
        onCloseFullscreenImage,
        onCloseProfile,
        onCancelDelete,
        onCancelEdit,
        onCloseCreateGroup,
        onCloseComments,
        onCloseAddQuestion,
        onCloseSearch,
        onCloseFollowingPanel,
        onCloseAppBarDropdowns,
        onLeaveGroupFeed,
    } = params;

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();

            const action = resolveForumEscapeAction({
                fullscreenImage,
                profileView,
                pendingDeletePostId,
                editingPostId,
                isCreateGroupOpen,
                commentingPostId,
                isAddQuestionOpen,
                isSearchOpen,
                showFollowingPanel,
                activeGroupId,
                forumAppBarDropdownOpen,
            });
            switch (action) {
                case 'close-fullscreen-image':
                    onCloseFullscreenImage();
                    break;
                case 'close-profile':
                    onCloseProfile();
                    break;
                case 'cancel-delete':
                    onCancelDelete();
                    break;
                case 'cancel-edit':
                    onCancelEdit();
                    break;
                case 'close-create-group':
                    onCloseCreateGroup();
                    break;
                case 'close-comments':
                    onCloseComments();
                    releaseBodyScrollLock();
                    break;
                case 'close-add-question':
                    onCloseAddQuestion();
                    releaseBodyScrollLock();
                    break;
                case 'close-search':
                    onCloseSearch();
                    break;
                case 'close-following-panel':
                    onCloseFollowingPanel();
                    break;
                case 'close-app-bar-dropdown':
                    onCloseAppBarDropdowns();
                    break;
                case 'leave-group-feed':
                    onLeaveGroupFeed();
                    break;
                case 'exit-forum':
                    onBack?.();
                    releaseBodyScrollLock();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [
        fullscreenImage,
        profileView,
        pendingDeletePostId,
        editingPostId,
        isCreateGroupOpen,
        commentingPostId,
        isAddQuestionOpen,
        isSearchOpen,
        showFollowingPanel,
        activeGroupId,
        forumAppBarDropdownOpen,
        onBack,
        onCloseFullscreenImage,
        onCloseProfile,
        onCancelDelete,
        onCancelEdit,
        onCloseCreateGroup,
        onCloseComments,
        onCloseAddQuestion,
        onCloseSearch,
        onCloseFollowingPanel,
        onCloseAppBarDropdowns,
        onLeaveGroupFeed,
    ]);
}
