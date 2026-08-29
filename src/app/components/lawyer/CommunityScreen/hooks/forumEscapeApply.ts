import { releaseBodyScrollLock } from '@/app/utils/bodyScrollLock';
import {
    type ForumEscapeAction,
    type ForumEscapeSnapshot,
} from '@/app/components/lawyer/CommunityScreen/forumEscapeStack';
import {
    getForumRepositoryEscapeHandlers,
    getForumRepositoryEscapeSnapshot,
} from '@/app/components/lawyer/CommunityScreen/forumRepositoryEscapeBridge';
import type { UseForumEscapeStackParams } from './useForumEscapeStack.types';

export type ForumEscapeHandlers = Pick<
    UseForumEscapeStackParams,
    | 'onBack'
    | 'onCloseProfile'
    | 'onCancelDelete'
    | 'onCancelEdit'
    | 'onCloseCreateGroup'
    | 'onCloseComments'
    | 'onCloseAddQuestion'
    | 'onCloseSearch'
    | 'onCloseFollowingPanel'
    | 'onCloseAppBarDropdowns'
    | 'onLeaveGroupFeed'
>;

export function applyForumEscapeAction(action: ForumEscapeAction, params: ForumEscapeHandlers): void {
    switch (action) {
        case 'close-profile':
            params.onCloseProfile();
            break;
        case 'cancel-delete':
            params.onCancelDelete();
            break;
        case 'cancel-edit':
            params.onCancelEdit();
            break;
        case 'close-repository-delete': {
            getForumRepositoryEscapeHandlers().cancelDelete();
            break;
        }
        case 'close-repository-preview': {
            getForumRepositoryEscapeHandlers().closePreview();
            break;
        }
        case 'close-repository-upload': {
            getForumRepositoryEscapeHandlers().closeUpload();
            break;
        }
        case 'close-create-group':
            params.onCloseCreateGroup();
            break;
        case 'close-comments':
            params.onCloseComments();
            releaseBodyScrollLock();
            break;
        case 'close-add-question':
            params.onCloseAddQuestion();
            releaseBodyScrollLock();
            break;
        case 'close-search':
            params.onCloseSearch();
            break;
        case 'close-following-panel':
            params.onCloseFollowingPanel();
            break;
        case 'close-app-bar-dropdown':
            params.onCloseAppBarDropdowns();
            break;
        case 'leave-group-feed':
            params.onLeaveGroupFeed();
            break;
        case 'exit-forum':
            params.onBack?.();
            releaseBodyScrollLock();
            break;
        default:
            break;
    }
}

export function buildForumEscapeSnapshot(
    p: UseForumEscapeStackParams,
    repository: ReturnType<typeof getForumRepositoryEscapeSnapshot>,
): ForumEscapeSnapshot {
    return {
        profileView: p.profileView,
        pendingDeletePostId: p.pendingDeletePostId,
        editingPostId: p.editingPostId,
        repositoryDeleteOpen: repository.deleteOpen,
        repositoryPreviewOpen: repository.previewOpen,
        repositoryUploadOpen: repository.isUploadModalOpen,
        isCreateGroupOpen: p.isCreateGroupOpen,
        commentingPostId: p.commentingPostId,
        isAddQuestionOpen: p.isAddQuestionOpen,
        isSearchOpen: p.isSearchOpen,
        showFollowingPanel: p.showFollowingPanel,
        activeGroupId: p.activeGroupId,
        forumAppBarDropdownOpen: p.forumAppBarDropdownOpen,
    };
}

export function buildForumEscapeHandlers(p: UseForumEscapeStackParams): ForumEscapeHandlers {
    return {
        onBack: p.onBack,
        onCloseProfile: p.onCloseProfile,
        onCancelDelete: p.onCancelDelete,
        onCancelEdit: p.onCancelEdit,
        onCloseCreateGroup: p.onCloseCreateGroup,
        onCloseComments: p.onCloseComments,
        onCloseAddQuestion: p.onCloseAddQuestion,
        onCloseSearch: p.onCloseSearch,
        onCloseFollowingPanel: p.onCloseFollowingPanel,
        onCloseAppBarDropdowns: p.onCloseAppBarDropdowns,
        onLeaveGroupFeed: p.onLeaveGroupFeed,
    };
}
