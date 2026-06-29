import { beforeEach, describe, expect, it, vi } from 'vitest';
import { syncForumNotificationsToAppStore } from '@/app/services/forum/forumNotificationBridge';
import type { ForumNotification } from '@/app/services/lawyer-cloud';

const upsertNotifications = vi.fn();

vi.mock('@/app/stores/notificationStore', () => ({
    useNotificationStore: {
        getState: () => ({ upsertNotifications }),
    },
}));

describe('syncForumNotificationsToAppStore', () => {
    beforeEach(() => {
        upsertNotifications.mockClear();
    });

    it('يستدعي upsertNotifications دفعة واحدة بمعرّف المنتدى', () => {
        const notifications: ForumNotification[] = [
            {
                id: 'fn-1',
                userId: 'user-1',
                type: 'reply',
                title: 'رد',
                message: 'نص',
                read: false,
                createdAt: '2026-06-01T00:00:00.000Z',
                postId: 'p-1',
            },
        ];

        const count = syncForumNotificationsToAppStore('user-1', notifications);
        expect(count).toBe(1);
        expect(upsertNotifications).toHaveBeenCalledWith([
            expect.objectContaining({ id: 'fn-1', type: 'forum_reply' }),
        ]);
    });

    it('يتخطّى إشعارات مستخدم آخر', () => {
        syncForumNotificationsToAppStore('user-1', [
            {
                id: 'fn-2',
                userId: 'other-user',
                type: 'reply',
                title: 'x',
                message: 'y',
                read: false,
                createdAt: '2026-06-01T00:00:00.000Z',
            },
        ]);
        expect(upsertNotifications).not.toHaveBeenCalled();
    });
});
