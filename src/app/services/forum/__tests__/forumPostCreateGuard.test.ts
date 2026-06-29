import { describe, expect, it } from 'vitest';
import { sanitizeCommunityPostForCreate } from '../forumPostCreateGuard';
import type { CommunityPost } from '@/app/services/lawyer-cloud';

function buildPost(overrides: Partial<CommunityPost> = {}): CommunityPost {
    return {
        id: 'p1',
        authorId: 'user-1',
        authorName: 'محامي',
        content: 'محتوى منشور تجريبي طويل بما يكفي',
        tags: ['قانون'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        attachment: null,
        upvoterIds: ['attacker'],
        comments: [
            {
                id: 'c1',
                postId: 'p1',
                authorId: 'attacker',
                authorName: 'مهاجم',
                content: 'تعليق محقون',
                createdAt: '2026-01-01T00:00:00.000Z',
            },
        ],
        bestCommentId: 'c1',
        isPinned: true,
        isLocked: true,
        isUrgent: true,
        isAnonymous: true,
        ...overrides,
    };
}

describe('sanitizeCommunityPostForCreate', () => {
    it('يزيل حقول الصلاحيات والتصويت والتعليقات المحقونة', () => {
        const safe = sanitizeCommunityPostForCreate(buildPost(), 'user-1');
        expect(safe.isPinned).toBeUndefined();
        expect(safe.isLocked).toBeUndefined();
        expect(safe.upvoterIds).toEqual([]);
        expect(safe.comments).toEqual([]);
        expect(safe.bestCommentId).toBeNull();
        expect(safe.isEdited).toBeUndefined();
    });

    it('يحافظ على الحقول المسموحة للناشر', () => {
        const safe = sanitizeCommunityPostForCreate(buildPost(), 'user-1');
        expect(safe.authorId).toBe('user-1');
        expect(safe.isUrgent).toBe(true);
        expect(safe.isAnonymous).toBe(true);
        expect(safe.tags).toEqual(['قانون']);
    });

    it('يرفض مرفقات javascript:', () => {
        const safe = sanitizeCommunityPostForCreate(
            buildPost({
                attachment: {
                    type: 'image',
                    url: 'javascript:alert(1)',
                    name: 'x.png',
                },
            }),
            'user-1',
        );
        expect(safe.attachment).toBeNull();
    });
});
