import { describe, expect, it } from 'vitest';
import { mapForumNotificationToModel } from '@/app/services/notifications/forumNotificationMapper';
import type { ForumNotification } from '@/app/services/lawyer-cloud';

function makeForum(partial: Partial<ForumNotification> = {}): ForumNotification {
    return {
        id: 'forum-1',
        userId: 'user-1',
        type: 'reply',
        title: 'رد جديد',
        message: 'محتوى',
        read: false,
        createdAt: '2026-06-01T00:00:00.000Z',
        postId: 'post-1',
        ...partial,
    };
}

describe('mapForumNotificationToModel', () => {
    it('يحافظ على معرّف المنتدى الأصلي', () => {
        const model = mapForumNotificationToModel(makeForum({ id: 'stable-id' }));
        expect(model.id).toBe('stable-id');
        expect(model.type).toBe('forum_reply');
        expect(model.category).toBe('forum');
        expect(model.isRead).toBe(false);
    });

    it('يُعيّن forum_mention و forum_solved', () => {
        expect(mapForumNotificationToModel(makeForum({ type: 'mention' })).type).toBe('forum_mention');
        expect(mapForumNotificationToModel(makeForum({ type: 'best_answer' })).type).toBe('forum_solved');
    });
});
