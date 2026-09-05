import { describe, it, expect } from 'vitest';
import { mergeCommunityPostsById } from '@/app/services/cloud/lawyerCommunityCloud';
import type { CommunityPost } from '@/app/services/cloud/lawyerCommunityTypes';

const base = (id: string, overrides: Partial<CommunityPost> = {}): CommunityPost => ({
    id,
    authorId: 'author-1',
    authorName: '┘à╪ص╪د┘à┘è',
    content: '┘à╪ص╪ز┘ê┘ë',
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
    it('┘è┘╪ذ┘é┘è ╪د┘┘╪╡ ╪د┘┘à┘╪╣╪»┘┘ّ┘ ┘à╪ص┘┘è╪د┘ï ╪ص╪ز┘ë ┘┘ê ┘â╪د┘ updatedAt ┘┘╪«╪د╪»┘à ╪ث╪ص╪»╪س (╪ز╪╡┘ê┘è╪ز)', () => {
        const local = base('p1', {
            content: '┘╪╡ ╪ذ╪╣╪» ╪د┘╪ز╪╣╪»┘è┘',
            isEdited: true,
            updatedAt: '2026-01-01T10:00:00.000Z',
        });
        const remote = base('p1', {
            content: '┘╪╡ ┘é╪»┘è┘à',
            updatedAt: '2026-01-01T12:00:00.000Z',
            upvoterIds: ['voter-1'],
        });
        const [merged] = mergeCommunityPostsById([local], [remote]);
        expect(merged?.content).toBe('┘╪╡ ╪ذ╪╣╪» ╪د┘╪ز╪╣╪»┘è┘');
        expect(merged?.upvoterIds).toContain('voter-1');
        expect(merged?.isEdited).toBe(true);
    });

    it('isEdited يتبع المحتوى المُبقى ولا يبقى باتحاد دائم', () => {
        const local = base('p6', {
            content: 'نفس النص',
            isEdited: true,
            updatedAt: '2026-01-01T10:00:00.000Z',
        });
        const remote = base('p6', {
            content: 'نفس النص',
            isEdited: false,
            updatedAt: '2026-01-01T12:00:00.000Z',
        });
        const [merged] = mergeCommunityPostsById([local], [remote]);
        expect(merged?.isEdited).toBeFalsy();
    });

    it('الوسوم تتبع النسخة الأحدث ولا تُوحَّد باتحاد دائم', () => {
        const local = base('p2', { tags: ['#مدني'], updatedAt: '2026-01-01T10:00:00.000Z' });
        const remote = base('p2', { tags: ['#جنائي'], updatedAt: '2026-01-01T12:00:00.000Z' });
        const [merged] = mergeCommunityPostsById([local], [remote]);
        expect(merged?.tags).toEqual(['#جنائي']);
    });

    it('يحافظ على وسوم المحلي إن كان هو الأحدث', () => {
        const local = base('p2b', { tags: ['#مدني'], updatedAt: '2026-01-01T14:00:00.000Z' });
        const remote = base('p2b', { tags: ['#جنائي'], updatedAt: '2026-01-01T12:00:00.000Z' });
        const [merged] = mergeCommunityPostsById([local], [remote]);
        expect(merged?.tags).toEqual(['#مدني']);
    });

    it('يفتح التثبيت والقفل من النسخة الأحدث ولا يثبّتهما للأبد', () => {
        const local = base('p3', {
            isPinned: true,
            isLocked: true,
            updatedAt: '2026-01-01T10:00:00.000Z',
        });
        const remote = base('p3', {
            isPinned: false,
            isLocked: false,
            updatedAt: '2026-01-01T12:00:00.000Z',
        });
        const [merged] = mergeCommunityPostsById([local], [remote]);
        expect(merged?.isPinned).toBeFalsy();
        expect(merged?.isLocked).toBeFalsy();
    });

    it('لا يعيد تصويتاً أُلغي على النسخة الأحدث', () => {
        const local = base('p4', {
            upvoterIds: ['u1'],
            updatedAt: '2026-01-01T10:00:00.000Z',
        });
        const remote = base('p4', {
            upvoterIds: [],
            updatedAt: '2026-01-01T12:00:00.000Z',
        });
        const [merged] = mergeCommunityPostsById([local], [remote]);
        expect(merged?.upvoterIds).toEqual([]);
    });

    it('يحذف تعليقاً غائباً عن الخادم عندما المنشور البعيد أحدث', () => {
        const local = base('p5', {
            comments: [
                {
                    id: 'c-del',
                    postId: 'p5',
                    authorId: 'u1',
                    authorName: 'محامٍ',
                    content: 'سيُحذف',
                    createdAt: '2026-01-01T00:00:00.000Z',
                },
            ],
            updatedAt: '2026-01-01T10:00:00.000Z',
        });
        const remote = base('p5', {
            comments: [],
            updatedAt: '2026-01-01T12:00:00.000Z',
        });
        const [merged] = mergeCommunityPostsById([local], [remote]);
        expect(merged?.comments).toEqual([]);
    });
});
