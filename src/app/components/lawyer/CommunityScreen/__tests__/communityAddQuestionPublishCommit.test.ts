import { describe, expect, it, vi } from 'vitest';
import { insertOptimisticForumPost, settlePublishedForumPost } from '../communityAddQuestionPublishCommit';
import type { CommunityPost } from '@/app/services/lawyer-cloud';

function post(partial: Partial<CommunityPost> = {}): CommunityPost {
    return {
        id: 'p1',
        authorId: 'u1',
        authorName: 'محامي',
        content: 'استشارة قانونية تجريبية طويلة',
        tags: ['جزائي'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        attachment: null,
        upvoterIds: [],
        comments: [],
        bestCommentId: null,
        ...partial,
    };
}

describe('communityAddQuestionPublishCommit', () => {
    it('يدرج تفاؤلياً في القائمة العامة', () => {
        const setPosts = vi.fn((updater: (prev: CommunityPost[]) => CommunityPost[]) => updater([]));
        const optimistic = insertOptimisticForumPost({
            post: post(),
            sourceContent: 'استشارة قانونية تجريبية طويلة',
            activeGroupId: null,
            appendPublishedGroupPost: vi.fn(),
            onForumPostPublished: vi.fn(),
            setPosts,
        });
        expect(setPosts).toHaveBeenCalled();
        expect(optimistic.id).toBe('p1');
    });

    it('يزيل المسودة التفاؤلية إن اختلف المعرّف بعد الحفظ', () => {
        const setPosts = vi.fn((updater: (prev: CommunityPost[]) => CommunityPost[]) =>
            updater([post(), post({ id: 'server' })]),
        );
        settlePublishedForumPost({
            saved: post({ id: 'server', content: 'استشارة قانونية تجريبية طويلة' }),
            post: post(),
            optimistic: post(),
            activeGroupId: null,
            appendPublishedGroupPost: vi.fn(),
            setPosts,
        });
        const next = setPosts.mock.calls[0][0]([post(), post({ id: 'server' })]);
        expect(next.map((row: CommunityPost) => row.id)).not.toContain('p1');
        expect(next.some((row: CommunityPost) => row.id === 'server')).toBe(true);
    });
});
