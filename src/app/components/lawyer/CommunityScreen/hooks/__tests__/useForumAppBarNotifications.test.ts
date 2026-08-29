import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: vi.fn(),
        warning: vi.fn(),
        success: vi.fn(),
        show: vi.fn(),
    },
}));

vi.mock('@/app/services/forumApiService', () => ({
    ForumApiService: {
        listForumNotifications: vi.fn(() =>
            Promise.resolve({ notifications: [], unreadCount: 0 }),
        ),
        markAllForumNotificationsRead: vi.fn(),
        markForumNotificationRead: vi.fn(),
        dismissForumNotification: vi.fn(),
    },
}));

vi.mock('@/app/hooks/useVisibilityAwareInterval', () => ({
    useVisibilityAwareInterval: vi.fn(),
}));

vi.mock('@/app/services/forum/forumNotificationsWarmCache', () => ({
    peekForumNotificationsCache: () => [],
    peekForumNotificationsFromLocal: () => [],
    peekForumNotificationsUnreadCache: () => 0,
    readForumNotificationsCache: () => Promise.resolve({ notifications: [], unreadCount: 0 }),
    warmForumNotificationsCache: vi.fn(),
}));

vi.mock('../forumAsync', () => ({
    withForumAsyncTimeout: (promise: Promise<unknown>) => promise,
}));

import { SmartToast } from '@/app/components/ui/SmartToast';
import { ForumApiService } from '@/app/services/forumApiService';
import { useForumAppBarNotifications } from '@/app/components/lawyer/CommunityScreen/hooks/useForumAppBarNotifications';

describe('useForumAppBarNotifications', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يبدأ بلا تنبيهات عند غياب userId', () => {
        const { result } = renderHook(() => useForumAppBarNotifications(null, false));
        expect(result.current.notifications).toEqual([]);
        expect(result.current.unreadCount).toBe(0);
    });

    it('handleBellClick يحذر عند غياب userId', () => {
        const { result } = renderHook(() => useForumAppBarNotifications(null, false));

        act(() => {
            result.current.handleBellClick();
        });

        expect(SmartToast.warning).toHaveBeenCalledWith('سجّل الدخول لعرض التنبيهات');
        expect(result.current.showNotifPanel).toBe(false);
    });

    it('لا يجلب التنبيهات من الشبكة بينما السطح مغلق', async () => {
        renderHook(() => useForumAppBarNotifications('lawyer-1', false, undefined, undefined, false));
        await Promise.resolve();
        expect(ForumApiService.listForumNotifications).not.toHaveBeenCalled();
    });
});
