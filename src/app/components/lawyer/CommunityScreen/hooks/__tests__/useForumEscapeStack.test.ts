import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { useForumEscapeStack } from '../useForumEscapeStack';

const nativeHandlers: Array<() => boolean> = [];

vi.mock('@/app/runtime/capacitorAppLifecycle', () => ({
    registerNativeBackHandler: (handler: () => boolean) => {
        nativeHandlers.push(handler);
        return () => {
            const i = nativeHandlers.indexOf(handler);
            if (i >= 0) nativeHandlers.splice(i, 1);
        };
    },
}));

vi.mock('@/app/components/lawyer/CommunityScreen/forumAddQuestionFilePickerGrace', () => ({
    isForumAddQuestionFilePickerGraceActive: () => false,
}));

const baseHandlers = {
    onBack: vi.fn(),
    onCloseProfile: vi.fn(),
    onCancelDelete: vi.fn(),
    onCancelEdit: vi.fn(),
    onCloseCreateGroup: vi.fn(),
    onCloseComments: vi.fn(),
    onCloseAddQuestion: vi.fn(),
    onCloseSearch: vi.fn(),
    onCloseFollowingPanel: vi.fn(),
    onCloseAppBarDropdowns: vi.fn(),
    onLeaveGroupFeed: vi.fn(),
};

describe('useForumEscapeStack', () => {
    beforeEach(() => {
        nativeHandlers.length = 0;
        for (const fn of Object.values(baseHandlers)) fn.mockClear();
    });

    it('Escape وCap يخرجان من المنتدى عندما لا توجد طبقة', () => {
        renderHook(() =>
            useForumEscapeStack({
                enabled: true,
                profileView: false,
                pendingDeletePostId: null,
                editingPostId: null,
                isCreateGroupOpen: false,
                commentingPostId: null,
                isAddQuestionOpen: false,
                isSearchOpen: false,
                showFollowingPanel: false,
                activeGroupId: null,
                forumAppBarDropdownOpen: false,
                ...baseHandlers,
            }),
        );

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(baseHandlers.onBack).toHaveBeenCalledTimes(1);

        expect(nativeHandlers[0]?.()).toBe(true);
        expect(baseHandlers.onBack).toHaveBeenCalledTimes(2);
    });

    it('Cap يغلق البحث قبل الخروج', () => {
        renderHook(() =>
            useForumEscapeStack({
                enabled: true,
                profileView: false,
                pendingDeletePostId: null,
                editingPostId: null,
                isCreateGroupOpen: false,
                commentingPostId: null,
                isAddQuestionOpen: false,
                isSearchOpen: true,
                showFollowingPanel: false,
                activeGroupId: null,
                forumAppBarDropdownOpen: false,
                ...baseHandlers,
            }),
        );

        expect(nativeHandlers[0]?.()).toBe(true);
        expect(baseHandlers.onCloseSearch).toHaveBeenCalledTimes(1);
        expect(baseHandlers.onBack).not.toHaveBeenCalled();
    });

    it('لا يستمع عندما keepAlive مغلق', () => {
        renderHook(() =>
            useForumEscapeStack({
                enabled: false,
                profileView: false,
                pendingDeletePostId: null,
                editingPostId: null,
                isCreateGroupOpen: false,
                commentingPostId: null,
                isAddQuestionOpen: false,
                isSearchOpen: false,
                showFollowingPanel: false,
                activeGroupId: null,
                forumAppBarDropdownOpen: false,
                ...baseHandlers,
            }),
        );

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(baseHandlers.onBack).not.toHaveBeenCalled();
        expect(nativeHandlers).toHaveLength(0);
    });
});
