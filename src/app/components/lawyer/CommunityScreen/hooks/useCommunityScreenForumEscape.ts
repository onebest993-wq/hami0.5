import { flushSync } from 'react-dom';
import { useForumEscapeStack } from './useForumEscapeStack';
import type { useCommunityScreenShell } from './useCommunityScreenShell';
import type { useCommunityGroupsFeed } from './useCommunityGroupsFeed';
import type { useCommunityAddQuestion } from './useCommunityAddQuestion';
import type { useCommunityPostActions } from './useCommunityPostActions';
import type { useCommunityScreenPostModeration } from './useCommunityScreenPostModeration';
import type { useCommunityScreenSearchOverlay } from './useCommunityScreenSearchOverlay';
import type { useCommunityScreenInteractions } from './useCommunityScreenInteractions';

export function useCommunityScreenForumEscape({
    forumSurfaceOpen,
    onBack,
    shell,
    postActions,
    postModeration,
    groupsFeed,
    addQuestion,
    searchOverlay,
    interactions,
}: {
    forumSurfaceOpen: boolean;
    onBack?: () => void;
    shell: ReturnType<typeof useCommunityScreenShell>;
    postActions: ReturnType<typeof useCommunityPostActions>;
    postModeration: ReturnType<typeof useCommunityScreenPostModeration>;
    groupsFeed: ReturnType<typeof useCommunityGroupsFeed>;
    addQuestion: ReturnType<typeof useCommunityAddQuestion>;
    searchOverlay: ReturnType<typeof useCommunityScreenSearchOverlay>;
    interactions: ReturnType<typeof useCommunityScreenInteractions>;
}) {
    return useForumEscapeStack({
        enabled: forumSurfaceOpen,
        profileView: shell.profileView !== null,
        pendingDeletePostId: postActions.pendingDeletePostId,
        editingPostId: postModeration.editingPostId,
        isCreateGroupOpen: groupsFeed.isCreateGroupOpen,
        commentingPostId: shell.commentingPostId,
        isAddQuestionOpen: addQuestion.isAddQuestionOpen,
        isSearchOpen: searchOverlay.isSearchOpen,
        showFollowingPanel: shell.showFollowingPanel,
        activeGroupId: groupsFeed.activeGroupId,
        forumAppBarDropdownOpen: shell.forumAppBarDropdownOpen,
        onBack,
        onCloseProfile: interactions.closeForumProfile,
        onCancelDelete: () => {
            if (!postActions.deletingPost) postActions.cancelDeletePostRequest();
        },
        onCancelEdit: () => {
            if (postModeration.savingEdit) return;
            postModeration.setEditingPostId(null);
            postModeration.setEditingText('');
        },
        onCloseCreateGroup: () => {
            if (groupsFeed.submittingGroup) return;
            groupsFeed.setIsCreateGroupOpen(false);
        },
        onCloseComments: () => shell.setCommentingPostId(null),
        onCloseAddQuestion: addQuestion.closeAddQuestion,
        onCloseSearch: searchOverlay.closeSearchOverlay,
        onCloseFollowingPanel: () => flushSync(() => shell.setShowFollowingPanel(false)),
        onCloseAppBarDropdowns: () => shell.closeAppBarDropdownsRef.current?.(),
        onLeaveGroupFeed: () => groupsFeed.setActiveGroupId(null),
    });
}
