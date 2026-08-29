import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';

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
        for (const key of SecureStoreService.listKeysSync()) {
            SecureStoreService.deleteItemSync(key);
        }
        localStorage.clear();
        localStorage.setItem('hami:community:posts:v1', JSON.stringify([E2E_POST]));
    });

    it('listPosts reads seeded visitor post and drains the plaintext mirror', async () => {
        vi.stubGlobal('indexedDB', undefined);
        const { CommunityDB } = await import('@/app/services/cloud/lawyerCommunityCloud');
        const posts = await CommunityDB.listPosts();
        expect(posts.map((p) => p.id)).toContain(E2E_POST.id);
        expect(localStorage.getItem('hami:community:posts:v1')).toBeNull();
    });

    it('listPosts returns quickly when deleted-ids mirror is absent', async () => {
        vi.stubGlobal('indexedDB', undefined);
        const { CommunityDB } = await import('@/app/services/cloud/lawyerCommunityCloud');
        const started = Date.now();
        await CommunityDB.listPosts();
        expect(Date.now() - started).toBeLessThan(500);
    });

    it('يرحّل معرّفات الحذف من المرآة الصريحة ثم يمحوها', async () => {
        vi.stubGlobal('indexedDB', undefined);
        localStorage.setItem('hami:community:deleted-ids:v1', JSON.stringify(['gone-post']));
        const { getDeletedCommunityPostIds } = await import('@/app/services/cloud/lawyerCommunityCloud');
        const ids = await getDeletedCommunityPostIds();
        expect([...ids]).toContain('gone-post');
        expect(localStorage.getItem('hami:community:deleted-ids:v1')).toBeNull();
        expect(SecureStoreService.getItemSync('hami:community:deleted-ids:v1')).toBe(
            JSON.stringify(['gone-post']),
        );
    });

    it('syncCommunityPostToLocalMirror يضيف المنشور فوراً', async () => {
        const { syncCommunityPostToLocalMirror } = await import('@/app/services/cloud/lawyerCommunityCloud');
        syncCommunityPostToLocalMirror({
            ...E2E_POST,
            id: 'synced-now',
            content: 'منشور مزامن فوري للمرفق',
        } as never);
        expect(localStorage.getItem('hami:community:posts:v1')).toBeNull();
        const stored = JSON.parse(
            String(SecureStoreService.getItemSync('hami:community:posts:v1')),
        ) as Array<{ id: string }>;
        expect(stored.map((p) => p.id)).toContain('synced-now');
        expect(stored.map((p) => p.id)).toContain(E2E_POST.id);
    });
});
