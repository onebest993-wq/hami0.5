import { describe, expect, it } from 'vitest';
import { postRowToCommunity, type ForumCommentRow, type ForumPostRow } from './forumMapper';

describe('forumMapper', () => {
    it('maps post row with comments', () => {
        const row: ForumPostRow = {
            id: 'p1',
            author_id: 'u1',
            author_name: 'محامي',
            content: 'نص',
            tags: ['#مدني'],
            attachment: null,
            upvoter_ids: ['u2'],
            best_comment_id: 'c1',
            is_urgent: false,
            is_anonymous: false,
            is_edited: false,
            is_pinned: true,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-02T00:00:00.000Z',
        };
        const comments: ForumCommentRow[] = [
            {
                id: 'c1',
                post_id: 'p1',
                author_id: 'u2',
                author_name: 'زميل',
                content: 'رد',
                parent_id: null,
                created_at: '2026-01-01T01:00:00.000Z',
            },
        ];
        const post = postRowToCommunity(row, comments);
        expect(post.id).toBe('p1');
        expect(post.comments).toHaveLength(1);
        expect(post.isPinned).toBe(true);
        expect(post.upvoterIds).toEqual(['u2']);
    });
});
