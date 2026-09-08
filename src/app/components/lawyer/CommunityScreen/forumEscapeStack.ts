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

/** Escape Stack 4 طبقات لقسم المنتدى — Top-first pop (أعلى طبقة أولاً) */
type ForumEscapeOverlayLayer = 'L0-surface' | 'L1-overlay' | 'L2-popup' | 'L3-nested';

const FORUM_ESCAPE_LAYER_PRIORITY: Record<ForumEscapeOverlayLayer, number> = {
    'L0-surface': 0,
    'L1-overlay': 1,
    'L2-popup': 2,
    'L3-nested': 3,
};

const forumActiveOverlayKeys = new Map<string, ForumEscapeOverlayLayer>();

function classifyForumKey(key: string): ForumEscapeOverlayLayer {
    const k = key.toLowerCase();
    if (k.includes('nested') || k.includes('preview') || k.includes('repository-viewer') || k.includes('imagezoom')) return 'L3-nested';
    if (k.includes('popup') || k.includes('dropdown') || k.includes('menu') || k.includes('tooltip')) return 'L2-popup';
    if (k.includes('overlay') || k.includes('sheet') || k.includes('profile') || k.includes('dialog') || k.includes('comments')) return 'L1-overlay';
    return 'L0-surface';
}

export function blockForumOverlayEscape(key: string): void {
    forumActiveOverlayKeys.set(key, classifyForumKey(key));
}

export function unblockForumOverlayEscape(key: string): void {
    forumActiveOverlayKeys.delete(key);
}

export function isForumOverlayEscapeBlocked(): boolean {
    return forumActiveOverlayKeys.size > 0;
}

export function unblockAllForumOverlayEscape(): void {
    forumActiveOverlayKeys.clear();
}

/** للاختبارات */
export function resetForumOverlayEscapeForTests(): void {
    forumActiveOverlayKeys.clear();
}

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
