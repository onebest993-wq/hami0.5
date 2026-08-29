import { useEffect, useRef, type MutableRefObject } from 'react';

type UseCommunityScreenKeepAliveDismissParams = {
    forumSurfaceOpen: boolean;
    deletingPost: boolean;
    cancelDeletePostRequest: () => void;
    savingEdit: boolean;
    setEditingPostId: (id: string | null) => void;
    setEditingText: (text: string) => void;
    submittingGroup: boolean;
    setIsCreateGroupOpen: (open: boolean) => void;
    setCommentingPostId: (id: string | null) => void;
    closeAddQuestion: (opts?: { soft?: boolean }) => void;
    closeSearchOverlay: () => void;
    setShowFollowingPanel: (open: boolean) => void;
    closeAppBarDropdownsRef: MutableRefObject<(() => void) | null>;
    setForumAppBarDropdownOpen: (open: boolean) => void;
    setProfileView: (view: { userId: string; displayName?: string } | null) => void;
};

/** keepAlive مغلق: أسقط طبقات portal على document.body حتى لا تبقى فوق الـ dock */
export function useCommunityScreenKeepAliveDismiss({
    forumSurfaceOpen,
    deletingPost,
    cancelDeletePostRequest,
    savingEdit,
    setEditingPostId,
    setEditingText,
    submittingGroup,
    setIsCreateGroupOpen,
    setCommentingPostId,
    closeAddQuestion,
    closeSearchOverlay,
    setShowFollowingPanel,
    closeAppBarDropdownsRef,
    setForumAppBarDropdownOpen,
    setProfileView,
}: UseCommunityScreenKeepAliveDismissParams) {
    const forumWasOpenRef = useRef(forumSurfaceOpen);

    useEffect(() => {
        const wasOpen = forumWasOpenRef.current;
        forumWasOpenRef.current = forumSurfaceOpen;
        if (forumSurfaceOpen || !wasOpen) return;
        setProfileView(null);
        if (!deletingPost) cancelDeletePostRequest();
        if (!savingEdit) {
            setEditingPostId(null);
            setEditingText('');
        }
        if (!submittingGroup) setIsCreateGroupOpen(false);
        setCommentingPostId(null);
        closeAddQuestion({ soft: true });
        closeSearchOverlay();
        setShowFollowingPanel(false);
        closeAppBarDropdownsRef.current?.();
        setForumAppBarDropdownOpen(false);
    }, [
        forumSurfaceOpen,
        deletingPost,
        cancelDeletePostRequest,
        savingEdit,
        submittingGroup,
        setIsCreateGroupOpen,
        closeAddQuestion,
        closeSearchOverlay,
        setEditingPostId,
        setEditingText,
        setCommentingPostId,
        setShowFollowingPanel,
        closeAppBarDropdownsRef,
        setForumAppBarDropdownOpen,
        setProfileView,
    ]);
}
