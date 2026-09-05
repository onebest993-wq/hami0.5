import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useForumUnreadCount } from '@/app/hooks/useForumUnreadCount';
import { useVisibilityAwareInterval } from '@/app/hooks/useVisibilityAwareInterval';

const listForumNotifications = vi.fn();

const overlayCtl = vi.hoisted(() => {
    let active = false;
    const listeners = new Set<() => void>();
    return {
        is: () => active,
        set: (value: boolean) => {
            if (active === value) return;
            active = value;
            for (const listener of listeners) listener();
        },
        subscribe: (onChange: () => void) => {
            listeners.add(onChange);
            return () => {
                listeners.delete(onChange);
            };
        },
        reset: () => {
            active = false;
            listeners.clear();
        },
    };
});

vi.mock('@/app/hooks/useVisibilityAwareInterval', () => ({
    useVisibilityAwareInterval: vi.fn(),
}));

vi.mock('@/app/components/lawyer/CommunityScreen/communityFeedPolicy', () => ({
    resolveForumUnreadPollMs: (stream: boolean) => (stream ? 0 : 12_000),
}));

vi.mock('@/app/services/forum/ForumNotificationStreamService', () => ({
    ForumNotificationStreamService: {
        isRunning: () => false,
        subscribe: () => () => undefined,
    },
}));

vi.mock('@/app/runtime/forumSurfaceLive', () => ({
    isForumSurfaceLive: () => overlayCtl.is(),
    subscribeForumSurfaceLive: (onChange: () => void) => overlayCtl.subscribe(onChange),
    setForumSurfaceLive: (active: boolean) => overlayCtl.set(active),
    resetForumSurfaceLiveForTests: () => overlayCtl.reset(),
}));

vi.mock('@/app/services/forumApiService', () => ({
    ForumApiService: {
        listForumNotifications,
    },
}));

vi.mock('@/app/services/forum/forumNotificationBridge', () => ({
    syncForumNotificationsToAppStore: vi.fn(),
}));

vi.mock('@/app/services/secureApiNetworkFeatures', () => ({
    canReachProtectedServerNetwork: () => true,
}));

describe('useForumUnreadCount', () => {
    beforeEach(() => {
        overlayCtl.reset();
        vi.clearAllMocks();
        listForumNotifications.mockReset();
        listForumNotifications.mockResolvedValue({ notifications: [], unreadCount: 3 });
    });

    afterEach(() => {
        overlayCtl.reset();
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

    it('حدث الشارة يحدّث العدّاد دون جلب إضافي', async () => {
        const { result } = renderHook(() => useForumUnreadCount('user-1', true));
        await waitFor(() => {
            expect(result.current.count).toBe(3);
        });
        listForumNotifications.mockClear();
        act(() => {
            window.dispatchEvent(
                new CustomEvent('hami:forum-unread-changed', {
                    detail: { count: 9, refresh: true },
                }),
            );
        });
        expect(result.current.count).toBe(9);
        expect(listForumNotifications).not.toHaveBeenCalled();
    });

    it('يوقف استطلاع الرئيسية عندما سطح المنتدى يملك الاستطلاع', async () => {
        renderHook(() => useForumUnreadCount('user-1', true));
        await waitFor(() => {
            expect(useVisibilityAwareInterval).toHaveBeenCalledWith(expect.any(Function), 12_000, true);
        });

        act(() => {
            overlayCtl.set(true);
        });

        expect(useVisibilityAwareInterval).toHaveBeenLastCalledWith(expect.any(Function), 12_000, false);
    });
});
