import { beforeEach, describe, expect, it, vi } from 'vitest';

const E2E_POST = {
    id: 'e2e-forum-post-visitor-profile',
    authorId: 'e2e-forum-author-2',
    authorName: 'محامٍ زائر اختبار',
    content: 'استشارة قانونية تجريبية لفتح ملف زائر من المنتدى — نص كافٍ للعرض',
    tags: ['اختبار'],
    createdAt: '2026-06-28T12:00:00.000Z',
    updatedAt: '2026-06-28T12:00:00.000Z',
    attachment: null,
    upvoterIds: [] as string[],
    comments: [] as unknown[],
    bestCommentId: null,
    isAnonymous: false,
};

describe('lawyerCommunityCloud E2E visitor post', () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('hami:community:posts:v1', JSON.stringify([E2E_POST]));
    });

    it('listPosts reads seeded visitor post from localStorage mirror', async () => {
        vi.stubGlobal('indexedDB', undefined);
        const { CommunityDB } = await import('@/app/services/cloud/lawyerCommunityCloud');
        const posts = await CommunityDB.listPosts();
        expect(posts.map((p) => p.id)).toContain(E2E_POST.id);
    });

    it('listPosts returns quickly when deleted-ids mirror is absent', async () => {
        vi.stubGlobal('indexedDB', undefined);
        const { CommunityDB } = await import('@/app/services/cloud/lawyerCommunityCloud');
        const started = Date.now();
        await CommunityDB.listPosts();
        expect(Date.now() - started).toBeLessThan(500);
    });
});
