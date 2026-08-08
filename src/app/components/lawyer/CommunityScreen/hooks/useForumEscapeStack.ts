import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { releaseBodyScrollLock } from '@/app/utils/bodyScrollLock';
import {
    resolveForumEscapeAction,
    type ForumEscapeAction,
    type ForumEscapeSnapshot,
} from '@/app/components/lawyer/CommunityScreen/forumEscapeStack';
import {
    getForumRepositoryEscapeHandlers,
    getForumRepositoryEscapeSnapshot,
    subscribeForumRepositoryEscape,
} from '@/app/components/lawyer/CommunityScreen/forumRepositoryEscapeBridge';
import { isForumAddQuestionFilePickerGraceActive } from '@/app/components/lawyer/CommunityScreen/forumAddQuestionFilePickerGrace';
import { registerNativeBackHandler } from '@/app/runtime/capacitorAppLifecycle';

export type UseForumEscapeStackParams = {
    /** keepAlive مغلق: لا تستمع Escape / native back */
    enabled?: boolean;
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

type ForumEscapeHandlers = Pick<
    UseForumEscapeStackParams,
    | 'onBack'
    | 'onCloseFullscreenImage'
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

function applyForumEscapeAction(action: ForumEscapeAction, params: ForumEscapeHandlers): void {
    switch (action) {
        case 'close-fullscreen-image':
            params.onCloseFullscreenImage();
            break;
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
            const repo = getForumRepositoryEscapeHandlers();
            repo.cancelDelete();
            break;
        }
        case 'close-repository-preview': {
            const repo = getForumRepositoryEscapeHandlers();
            repo.closePreview();
            break;
        }
        case 'close-repository-upload': {
            const repo = getForumRepositoryEscapeHandlers();
            repo.closeUpload();
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

function buildSnapshot(
    p: UseForumEscapeStackParams,
    repository: ReturnType<typeof getForumRepositoryEscapeSnapshot>,
): ForumEscapeSnapshot {
    return {
        fullscreenImage: p.fullscreenImage,
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

function buildHandlers(p: UseForumEscapeStackParams): ForumEscapeHandlers {
    return {
        onBack: p.onBack,
        onCloseFullscreenImage: p.onCloseFullscreenImage,
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

/**
 * Escape + native back + زر رجوع الشريط — نفس مكدس الطبقات (الداخل أولاً ثم الخروج).
 */
export function useForumEscapeStack(params: UseForumEscapeStackParams): {
    popForumLayer: () => boolean;
} {
    const paramsRef = useRef(params);
    paramsRef.current = params;

    const repositoryEscape = useSyncExternalStore(
        subscribeForumRepositoryEscape,
        getForumRepositoryEscapeSnapshot,
        getForumRepositoryEscapeSnapshot,
    );
    const repositoryEscapeRef = useRef(repositoryEscape);
    repositoryEscapeRef.current = repositoryEscape;

    const popForumLayer = useCallback((): boolean => {
        const p = paramsRef.current;
        if (p.enabled === false) return false;
        const action = resolveForumEscapeAction(buildSnapshot(p, repositoryEscapeRef.current));
        if (action === 'close-add-question' && isForumAddQuestionFilePickerGraceActive()) {
            return true;
        }
        applyForumEscapeAction(action, buildHandlers(p));
        return true;
    }, []);

    useEffect(() => {
        if (params.enabled === false) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            popForumLayer();
        };

        window.addEventListener('keydown', onKeyDown, true);
        const unregisterNativeBack = registerNativeBackHandler(popForumLayer);
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
            unregisterNativeBack();
        };
    }, [params.enabled, popForumLayer]);

    return { popForumLayer };
}
