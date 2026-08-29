import { describe, expect, it } from 'vitest';
import { buildForumPostDraft } from '../communityAddQuestionPublishDraft';

describe('buildForumPostDraft', () => {
    it('يبني مسودة مع وسم المجموعة عند الحاجة', () => {
        const post = buildForumPostDraft({
            currentUserId: 'u1',
            authorName: 'محامي',
            content: 'استشارة قانونية تجريبية طويلة',
            tagText: 'جزائي',
            attachment: null,
            isAnonymous: true,
            isUrgent: true,
            activeGroupId: 'g1',
        });
        expect(post.authorId).toBe('u1');
        expect(post.content).toBe('استشارة قانونية تجريبية طويلة');
        expect(post.isAnonymous).toBe(true);
        expect(post.isUrgent).toBe(true);
        expect(post.groupId).toBe('g1');
        expect(post.comments).toEqual([]);
        expect(post.bestCommentId).toBeNull();
    });

    it('لا يضع groupId خارج المجموعة', () => {
        const post = buildForumPostDraft({
            currentUserId: 'u1',
            authorName: 'محامي',
            content: 'استشارة قانونية تجريبية طويلة',
            tagText: '',
            attachment: null,
            isAnonymous: false,
            isUrgent: false,
            activeGroupId: null,
        });
        expect(post.groupId).toBeUndefined();
        expect(post.isAnonymous).toBeUndefined();
        expect(post.isUrgent).toBeUndefined();
    });
});
