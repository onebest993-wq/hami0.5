import { describe, expect, it } from 'vitest';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { collectForumParticipants, extractForumMentionIds } from '@/app/services/forum/forumMentionUtils';

const basePost: CommunityPost = {
    id: 'post-1',
    authorId: 'author-1',
    authorName: 'أحمد علي',
    content: 'سؤال قانوني',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attachment: null,
    comments: [
        {
            id: 'c1',
            postId: 'post-1',
            authorId: 'lawyer-2',
            authorName: 'سارة محمود',
            content: 'رد',
            createdAt: new Date().toISOString(),
        },
    ],
    upvoterIds: [],
    tags: [],
};

describe('forumMentionUtils', () => {
    it('collects unique participants', () => {
        const participants = collectForumParticipants(basePost);
        expect(participants).toHaveLength(2);
        expect(participants.map((p) => p.id)).toContain('author-1');
        expect(participants.map((p) => p.id)).toContain('lawyer-2');
    });

    it('extracts uuid mentions', () => {
        const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
        const ids = extractForumMentionIds(`مرحباً @${id}`, []);
        expect(ids).toEqual([id]);
    });

    it('extracts name mentions from participants', () => {
        const ids = extractForumMentionIds('شكراً @سارة محمود على المساعدة', collectForumParticipants(basePost));
        expect(ids).toEqual(['lawyer-2']);
    });
});
