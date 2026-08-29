import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    syncForumReadToShell,
    syncShellReadToForum,
} from '@/app/services/notifications/notificationReadSync';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';

const markAsRead = vi.fn().mockResolvedValue(undefined);
const persistForumNotificationRead = vi.fn().mockResolvedValue(undefined);
const countForumUnread = vi.fn().mockResolvedValue(2);
const emitForumUnreadCount = vi.fn();

vi.mock('@/app/stores/notificationStore', () => ({
    useNotificationStore: {
        getState: () => ({
            notifications: [
                {
                    id: 'fn-1',
                    title: 'رد',
                    message: 'نص',
                    type: 'forum_reply',
                    category: 'forum',
                    isRead: false,
                    createdAt: '2026-06-01T00:00:00.000Z',
                },
                {
                    id: 'sys-1',
                    title: 'نظام',
                    message: 'تنبيه',
                    type: 'system_alert',
                    isRead: false,
                    createdAt: '2026-06-01T00:00:00.000Z',
                },
            ] as NotificationModel[],
            markAsRead,
        }),
    },
}));

vi.mock('@/app/services/notifications/forumNotificationRead', () => ({
    persistForumNotificationRead: (...args: unknown[]) => persistForumNotificationRead(...args),
    countForumUnread: (...args: unknown[]) => countForumUnread(...args),
}));

vi.mock('@/app/services/forum/forumNotificationEvents', () => ({
    emitForumUnreadCount: (...args: unknown[]) => emitForumUnreadCount(...args),
}));

describe('notificationReadSync', () => {
    beforeEach(() => {
        markAsRead.mockClear();
        persistForumNotificationRead.mockClear();
        countForumUnread.mockClear();
        emitForumUnreadCount.mockClear();
    });

    it('syncForumReadToShell يستدعي markAsRead مع skipForumPersist', async () => {
        await syncForumReadToShell('user-1', 'fn-1');
        expect(markAsRead).toHaveBeenCalledWith('user-1', 'fn-1', { skipForumPersist: true });
    });

    it('syncShellReadToForum ي persist + emit بدون loop', async () => {
        await syncShellReadToForum('user-1', 'fn-1');
        expect(persistForumNotificationRead).toHaveBeenCalledWith('user-1', 'fn-1');
        expect(emitForumUnreadCount).toHaveBeenCalledWith(2);
        expect(markAsRead).not.toHaveBeenCalled();
    });
});
