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

    it('┘è╪»┘à╪ش ╪د┘┘ê╪│┘ê┘à ┘à┘ ╪د┘┘╪│╪«╪ر ╪د┘┘à╪ص┘┘è╪ر ┘ê╪د┘╪ذ╪╣┘è╪»╪ر', () => {
        const local = base('p2', { tags: ['#┘à╪»┘┘è'], updatedAt: '2026-01-01T10:00:00.000Z' });
        const remote = base('p2', { tags: ['#╪ز┘┘┘è╪░'], updatedAt: '2026-01-01T12:00:00.000Z' });
        const [merged] = mergeCommunityPostsById([local], [remote]);
        expect(merged?.tags).toEqual(expect.arrayContaining(['#┘à╪»┘┘è', '#╪ز┘┘┘è╪░']));
    });
});
