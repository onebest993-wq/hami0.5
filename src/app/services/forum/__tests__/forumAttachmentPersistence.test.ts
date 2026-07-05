import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sanitizeCommunityPostForCreate } from '../forumPostCreateGuard';
import type { CommunityPost } from '@/app/services/lawyer-cloud';

function buildPost(overrides: Partial<CommunityPost> = {}): CommunityPost {
    return {
        id: 'forum-attachment-debug-post',
        authorId: 'user-1',
        authorName: 'محامي',
        content: 'هذا منشور تجريبي طويل بما يكفي لاختبار ثبات المرفقات بعد إعادة التحميل',
        tags: ['اختبار'],
        createdAt: '2026-07-03T00:00:00.000Z',
        updatedAt: '2026-07-03T00:00:00.000Z',
        attachment: null,
        upvoterIds: [],
        comments: [],
        bestCommentId: null,
        ...overrides,
    };
}

describe('forum attachment persistence', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.stubGlobal('indexedDB', undefined);
    });

    it('keeps storage-only attachments during create sanitization', () => {
        const safe = sanitizeCommunityPostForCreate(
            buildPost({
                attachment: {
                    type: 'document',
                    url: '',
                    name: 'contract.pdf',
                    mimeType: 'application/pdf',
                    storagePath: 'idb:forum:debug-contract',
                },
            }),
            'user-1',
        );

        expect(safe.attachment).toEqual({
            type: 'document',
            name: 'contract.pdf',
            mimeType: 'application/pdf',
            storagePath: 'idb:forum:debug-contract',
        });
    });

    it('keeps storage-only attachments during local mirror hydration', async () => {
        localStorage.setItem(
            'hami:community:posts:v1',
            JSON.stringify([
                {
                    ...buildPost(),
                    attachment: {
                        type: 'image',
                        name: 'scan.png',
                        mimeType: 'image/png',
                        storagePath: 'idb:forum:debug-image',
                    },
                },
            ]),
        );

        const { CommunityDB } = await import('@/app/services/cloud/lawyerCommunityCloud');
        const posts = await CommunityDB.listPosts();

        expect(posts).toHaveLength(1);
        expect(posts[0]?.attachment).toEqual({
            type: 'image',
            name: 'scan.png',
            mimeType: 'image/png',
            storagePath: 'idb:forum:debug-image',
        });
    });
});
