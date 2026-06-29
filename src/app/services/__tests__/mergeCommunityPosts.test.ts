import { describe, it, expect } from 'vitest';
import { mergeCommunityPostsById } from '@/app/services/cloud/lawyerCommunityCloud';
import type { CommunityPost } from '@/app/services/cloud/lawyerCommunityTypes';

const base = (id: string, overrides: Partial<CommunityPost> = {}): CommunityPost => ({
    id,
    authorId: 'author-1',
    authorName: 'محامي',
    content: 'محتوى',
    tags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    attachment: null,
    upvoterIds: [],
    comments: [],
    bestCommentId: null,
    ...overrides,
});

describe('mergeCommunityPostsById', () => {
    it('يُبقي النص المُعدَّل محلياً حتى لو كان updatedAt للخادم أحدث (تصويت)', () => {
        const local = base('p1', {
            content: 'نص بعد التعديل',
            isEdited: true,
            updatedAt: '2026-01-01T10:00:00.000Z',
        });
        const remote = base('p1', {
            content: 'نص قديم',
            updatedAt: '2026-01-01T12:00:00.000Z',
            upvoterIds: ['voter-1'],
        });
        const [merged] = mergeCommunityPostsById([local], [remote]);
        expect(merged?.content).toBe('نص بعد التعديل');
        expect(merged?.upvoterIds).toContain('voter-1');
        expect(merged?.isEdited).toBe(true);
    });

    it('يدمج الوسوم من النسخة المحلية والبعيدة', () => {
        const local = base('p2', { tags: ['#مدني'], updatedAt: '2026-01-01T10:00:00.000Z' });
        const remote = base('p2', { tags: ['#تنفيذ'], updatedAt: '2026-01-01T12:00:00.000Z' });
        const [merged] = mergeCommunityPostsById([local], [remote]);
        expect(merged?.tags).toEqual(expect.arrayContaining(['#مدني', '#تنفيذ']));
    });
});
