import { describe, expect, it } from 'vitest';
import {
    resolveForumEscapeAction,
    type ForumEscapeSnapshot,
} from '@/app/components/lawyer/CommunityScreen/forumEscapeStack';

const base: ForumEscapeSnapshot = {
    fullscreenImage: null,
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
};

describe('resolveForumEscapeAction', () => {
    it('يغلق صورة ملء الشاشة أولاً', () => {
        expect(
            resolveForumEscapeAction({ ...base, fullscreenImage: 'https://x/img.png', isSearchOpen: true }),
        ).toBe('close-fullscreen-image');
    });

    it('يغلق الملف الشخصي قبل البحث', () => {
        expect(resolveForumEscapeAction({ ...base, profileView: true, isSearchOpen: true })).toBe(
            'close-profile',
        );
    });

    it('يلغي الحذف قبل التعليقات', () => {
        expect(
            resolveForumEscapeAction({ ...base, pendingDeletePostId: 'p1', commentingPostId: 'p1' }),
        ).toBe('cancel-delete');
    });

    it('يغلق نموذج الإضافة قبل البحث', () => {
        expect(resolveForumEscapeAction({ ...base, isAddQuestionOpen: true, isSearchOpen: true })).toBe(
            'close-add-question',
        );
    });

    it('يغلق البحث قبل لوحة المتابَعين', () => {
        expect(resolveForumEscapeAction({ ...base, isSearchOpen: true, showFollowingPanel: true })).toBe(
            'close-search',
        );
    });

    it('يخرج من جدار المجموعة قبل الخروج من المنتدى', () => {
        expect(resolveForumEscapeAction({ ...base, activeGroupId: 'g1' })).toBe('leave-group-feed');
    });

    it('يخرج من المنتدى عند عدم وجود طبقات', () => {
        expect(resolveForumEscapeAction(base)).toBe('exit-forum');
    });
});
