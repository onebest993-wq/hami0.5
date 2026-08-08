import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useForumUnreadCount } from '@/app/hooks/useForumUnreadCount';

const listForumNotifications = vi.fn();

vi.mock('@/app/hooks/useVisibilityAwareInterval', () => ({
    useVisibilityAwareInterval: () => undefined,
}));

vi.mock('@/app/services/forum/forumNotificationEvents', () => ({
    emitForumUnreadCount: vi.fn(),
    FORUM_UNREAD_CHANGED_EVENT: 'hami:forum-unread-changed',
}));

vi.mock('@/app/services/forumApiService', () => ({
    ForumApiService: {
        listForumNotifications,
    },
}));

vi.mock('@/app/services/forum/forumNotificationBridge', () => ({
    syncForumNotificationsToAppStore: vi.fn(),
}));

describe('useForumUnreadCount', () => {
    beforeEach(() => {
        listForumNotifications.mockReset();
        listForumNotifications.mockResolvedValue({ notifications: [], unreadCount: 3 });
    });

    it('يجلب العدّاد بصمت دون حالة تحميل مرئية', async () => {
        const { result } = renderHook(() => useForumUnreadCount('user-1', true));

        expect(result.current.isLoading).toBe(false);

        await waitFor(() => {
            expect(result.current.count).toBe(3);
        });

        expect(result.current.isLoading).toBe(false);
        expect(listForumNotifications).toHaveBeenCalledWith('user-1');
    });

    it('لا يُبقي التحميل عند تعطيل الجلب', () => {
        const { result } = renderHook(() => useForumUnreadCount('user-1', false));
        expect(result.current.isLoading).toBe(false);
        expect(result.current.count).toBe(0);
    });
});
