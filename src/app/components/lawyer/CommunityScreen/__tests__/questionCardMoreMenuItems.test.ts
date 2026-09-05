import { describe, expect, it, vi } from 'vitest';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { buildQuestionCardMoreMenuItems } from '../questionCardMoreMenuItems';

function post(partial: Partial<CommunityPost> = {}): CommunityPost {
    return {
        id: 'p1',
        authorId: 'owner',
        authorName: 'محامي',
        content: 'منشور',
        tags: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        attachment: null,
        upvoterIds: [],
        comments: [],
        bestCommentId: null,
        ...partial,
    };
}

const baseHandlers = {
    onTogglePin: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onReport: vi.fn(),
};

describe('buildQuestionCardMoreMenuItems', () => {
    it('المالك يرى تعديل وحذف وليس إبلاغ', () => {
        const { items, destructiveItems } = buildQuestionCardMoreMenuItems({
            post: post(),
            currentUserId: 'owner',
            isOwner: true,
            isAdmin: false,
            isPinned: false,
            isLocked: false,
            isThreadFollowing: false,
            canLockUnlock: false,
            canSaveToVault: false,
            ...baseHandlers,
        });
        expect(items.map((i) => i.id)).toContain('edit');
        expect(destructiveItems.map((i) => i.id)).toEqual(['delete']);
    });

    it('غير المالك يبلغ ولا يحذف', () => {
        const { destructiveItems } = buildQuestionCardMoreMenuItems({
            post: post(),
            currentUserId: 'other',
            isOwner: false,
            isAdmin: false,
            isPinned: false,
            isLocked: false,
            isThreadFollowing: false,
            canLockUnlock: false,
            canSaveToVault: false,
            ...baseHandlers,
        });
        expect(destructiveItems.map((i) => i.id)).toEqual(['report']);
    });

    it('المالك لا يرى متابعة النقاش ولا كتم نفسه', () => {
        const { items } = buildQuestionCardMoreMenuItems({
            post: post(),
            currentUserId: 'owner',
            isOwner: true,
            isAdmin: false,
            isPinned: false,
            isLocked: false,
            isThreadFollowing: false,
            canLockUnlock: false,
            canSaveToVault: false,
            onToggleThreadFollow: vi.fn(),
            onMuteUser: vi.fn(),
            ...baseHandlers,
        });
        expect(items.map((i) => i.id)).not.toContain('thread-follow');
        expect(items.map((i) => i.id)).not.toContain('mute');
    });

    it('المشاهد يرى تنبيهات النقاش وكتم المؤلف الظاهر', () => {
        const { items } = buildQuestionCardMoreMenuItems({
            post: post({ isAnonymous: false }),
            currentUserId: 'other',
            isOwner: false,
            isAdmin: false,
            isPinned: false,
            isLocked: false,
            isThreadFollowing: false,
            canLockUnlock: false,
            canSaveToVault: false,
            onToggleThreadFollow: vi.fn(),
            onMuteUser: vi.fn(),
            ...baseHandlers,
        });
        expect(items.map((i) => i.id)).toContain('thread-follow');
        expect(items.map((i) => i.id)).toContain('mute');
    });

    it('لا كتم لمؤلف مجهول', () => {
        const { items } = buildQuestionCardMoreMenuItems({
            post: post({ isAnonymous: true }),
            currentUserId: 'other',
            isOwner: false,
            isAdmin: false,
            isPinned: false,
            isLocked: false,
            isThreadFollowing: false,
            canLockUnlock: false,
            canSaveToVault: false,
            onMuteUser: vi.fn(),
            ...baseHandlers,
        });
        expect(items.map((i) => i.id)).not.toContain('mute');
    });
});
