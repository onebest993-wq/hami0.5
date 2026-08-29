import { describe, expect, it, vi } from 'vitest';

import {
    getForumRepositoryEscapeHandlers,
    getForumRepositoryEscapeSnapshot,
    resetForumRepositoryEscape,
    setForumRepositoryEscape,
    subscribeForumRepositoryEscape,
} from '../forumRepositoryEscapeBridge';
import { resolveForumEscapeAction } from '../forumEscapeStack';

describe('forumRepositoryEscapeBridge', () => {
    it('يُدمج مودالات المستودع في مكدس Escape', () => {
        const closeUpload = vi.fn();
        const closePreview = vi.fn();
        const cancelDelete = vi.fn();

        setForumRepositoryEscape(
            { isUploadModalOpen: false, previewOpen: true, deleteOpen: false },
            { closeUpload, closePreview, cancelDelete },
        );

        const repo = getForumRepositoryEscapeSnapshot();
        const action = resolveForumEscapeAction({
            profileView: false,
            pendingDeletePostId: null,
            editingPostId: null,
            repositoryDeleteOpen: repo.deleteOpen,
            repositoryPreviewOpen: repo.previewOpen,
            repositoryUploadOpen: repo.isUploadModalOpen,
            isCreateGroupOpen: false,
            commentingPostId: null,
            isAddQuestionOpen: false,
            isSearchOpen: false,
            showFollowingPanel: false,
            activeGroupId: null,
            forumAppBarDropdownOpen: false,
        });

        expect(action).toBe('close-repository-preview');
        getForumRepositoryEscapeHandlers().closePreview();
        expect(closePreview).toHaveBeenCalledTimes(1);

        resetForumRepositoryEscape();
        expect(getForumRepositoryEscapeSnapshot().previewOpen).toBe(false);
    });

    it('لا يُطلق المستمعين إن لم تتغير أعلام المودال', () => {
        const listener = vi.fn();
        const unsub = subscribeForumRepositoryEscape(listener);
        setForumRepositoryEscape(
            { isUploadModalOpen: false, previewOpen: false, deleteOpen: false },
            { closeUpload: () => {}, closePreview: () => {}, cancelDelete: () => {} },
        );
        listener.mockClear();
        setForumRepositoryEscape(
            { isUploadModalOpen: false, previewOpen: false, deleteOpen: false },
            { closeUpload: () => {}, closePreview: () => {}, cancelDelete: () => {} },
        );
        expect(listener).not.toHaveBeenCalled();
        unsub();
        resetForumRepositoryEscape();
    });
});
