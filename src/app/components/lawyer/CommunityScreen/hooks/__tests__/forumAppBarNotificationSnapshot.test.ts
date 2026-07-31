import { describe, expect, it, vi } from 'vitest';
import type { ForumNotification } from '@/app/services/lawyer-cloud';
import {
    applyForumNotificationsSnapshot,
    resolveInitialForumNotifications,
    sortForumNotificationsByDate,
} from '@/app/components/lawyer/CommunityScreen/hooks/forumAppBarNotificationSnapshot';

vi.mock('@/app/services/forum/forumNotificationsWarmCache', () => ({
    peekForumNotificationsCache: (userId: string) =>
        userId === 'cached-user'
            ? [{ id: 'n-1', read: false, title: 't', message: 'm', createdAt: '2026-01-01' }]
            : null,
    peekForumNotificationsUnreadCache: () => 3,
    peekForumNotificationsFromLocal: (userId: string) =>
        userId === 'local-user'
            ? [{ id: 'n-2', read: true, title: 'l', message: 'm', createdAt: '2026-01-02' }]
            : [],
}));

describe('forumAppBarNotificationSnapshot', () => {
    it('resolveInitialForumNotifications يعيد فارغاً بلا userId', () => {
        expect(resolveInitialForumNotifications(null)).toEqual({ notifications: [], unreadCount: 0 });
    });

    it('resolveInitialForumNotifications يفضّل الكاش', () => {
        const result = resolveInitialForumNotifications('cached-user');
        expect(result.notifications).toHaveLength(1);
        expect(result.unreadCount).toBe(3);
    });

    it('resolveInitialForumNotifications يسقط للمحلي', () => {
        const result = resolveInitialForumNotifications('local-user');
        expect(result.notifications[0]?.id).toBe('n-2');
        expect(result.unreadCount).toBe(0);
    });

    it('applyForumNotificationsSnapshot يحدّث المراجع', () => {
        const seen = { current: new Set<string>() };
        const lastUnread = { current: 0 };
        const slice = [{ id: 'a' }, { id: 'b' }] as ForumNotification[];

        applyForumNotificationsSnapshot(slice, 2, seen, lastUnread);

        expect(lastUnread.current).toBe(2);
        expect(seen.current.has('a')).toBe(true);
        expect(seen.current.has('b')).toBe(true);
    });

    it('sortForumNotificationsByDate الأحدث أولاً', () => {
        const sorted = sortForumNotificationsByDate([
            { id: '1', createdAt: '2026-01-01' } as ForumNotification,
            { id: '2', createdAt: '2026-06-01' } as ForumNotification,
        ]);
        expect(sorted[0]?.id).toBe('2');
    });
});
