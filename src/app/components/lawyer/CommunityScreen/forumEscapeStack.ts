/** لقطة حالة طبقات المنتدى — الأعمق أولاً في resolveForumEscapeAction */
export type ForumEscapeSnapshot = {
    profileView: boolean;
    pendingDeletePostId: string | null;
    editingPostId: string | null;
    repositoryDeleteOpen: boolean;
    repositoryPreviewOpen: boolean;
    repositoryUploadOpen: boolean;
    isCreateGroupOpen: boolean;
    commentingPostId: string | null;
    isAddQuestionOpen: boolean;
    isSearchOpen: boolean;
    showFollowingPanel: boolean;
    activeGroupId: string | null;
    forumAppBarDropdownOpen: boolean;
};

export type ForumEscapeAction =
    | 'close-profile'
    | 'cancel-delete'
    | 'cancel-edit'
    | 'close-repository-delete'
    | 'close-repository-preview'
    | 'close-repository-upload'
    | 'close-create-group'
    | 'close-comments'
    | 'close-add-question'
    | 'close-search'
    | 'close-following-panel'
    | 'close-app-bar-dropdown'
    | 'leave-group-feed'
    | 'exit-forum';

/** يحدد الإجراء التالي عند Escape — من الداخل إلى الخارج */
export function resolveForumEscapeAction(snapshot: ForumEscapeSnapshot): ForumEscapeAction {
    if (snapshot.profileView) return 'close-profile';
    if (snapshot.pendingDeletePostId) return 'cancel-delete';
    if (snapshot.editingPostId) return 'cancel-edit';
    if (snapshot.repositoryDeleteOpen) return 'close-repository-delete';
    if (snapshot.repositoryPreviewOpen) return 'close-repository-preview';
    if (snapshot.repositoryUploadOpen) return 'close-repository-upload';
    if (snapshot.isCreateGroupOpen) return 'close-create-group';
    if (snapshot.commentingPostId) return 'close-comments';
    if (snapshot.isAddQuestionOpen) return 'close-add-question';
    if (snapshot.isSearchOpen) return 'close-search';
    if (snapshot.showFollowingPanel) return 'close-following-panel';
    if (snapshot.forumAppBarDropdownOpen) return 'close-app-bar-dropdown';
    if (snapshot.activeGroupId) return 'leave-group-feed';
    return 'exit-forum';
}
