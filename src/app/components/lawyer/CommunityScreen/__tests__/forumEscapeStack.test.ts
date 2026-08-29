import { describe, expect, it } from 'vitest';
import {
    resolveForumEscapeAction,
    type ForumEscapeSnapshot,
} from '@/app/components/lawyer/CommunityScreen/forumEscapeStack';

const base: ForumEscapeSnapshot = {
    profileView: false,
    pendingDeletePostId: null,
    editingPostId: null,
    repositoryDeleteOpen: false,
    repositoryPreviewOpen: false,
    repositoryUploadOpen: false,
    isCreateGroupOpen: false,
    commentingPostId: null,
    isAddQuestionOpen: false,
    isSearchOpen: false,
    showFollowingPanel: false,
    activeGroupId: null,
    forumAppBarDropdownOpen: false,
};

describe('resolveForumEscapeAction', () => {
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

    it('يغلق تأكيد حذف المستند قبل رفع مستند', () => {
        expect(
            resolveForumEscapeAction({
                ...base,
                repositoryDeleteOpen: true,
                repositoryUploadOpen: true,
            }),
        ).toBe('close-repository-delete');
    });

    it('يغلق معاينة المستند قبل نموذج الرفع', () => {
        expect(
            resolveForumEscapeAction({
                ...base,
                repositoryPreviewOpen: true,
                repositoryUploadOpen: true,
            }),
        ).toBe('close-repository-preview');
    });

    it('يغلق نموذج رفع المستند قبل إنشاء مجموعة', () => {
        expect(
            resolveForumEscapeAction({
                ...base,
                repositoryUploadOpen: true,
                isCreateGroupOpen: true,
            }),
        ).toBe('close-repository-upload');
    });

    it('يخرج من المنتدى عند عدم وجود طبقات', () => {
        expect(resolveForumEscapeAction(base)).toBe('exit-forum');
    });
});
