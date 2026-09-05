import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotificationPanel } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationPanel';

vi.mock('@/app/stores/notificationStore', () => ({
    useNotificationStore: (selector: (s: unknown) => unknown) =>
        selector({
            notifications: [
                {
                    id: 'n1',
                    title: 'رد',
                    message: 'نص',
                    type: 'forum_reply',
                    isRead: false,
                    createdAt: new Date().toISOString(),
                },
            ],
            unreadCount: 1,
            isLoading: false,
            markAsRead: vi.fn(),
            markAllAsRead: vi.fn(),
        }),
}));

vi.mock('@/app/hooks/useIncomingCaseShares', () => ({
    useIncomingCaseShares: () => ({
        incoming: [],
        shares: [],
        pendingCount: 0,
        refresh: vi.fn(),
    }),
}));

vi.mock('@/app/components/lawyer/NotificationPanel/hooks/useNotificationPolling', () => ({
    useNotificationPolling: vi.fn(),
}));

vi.mock('@/app/components/lawyer/NotificationPanel/hooks/useNotificationActions', () => ({
    useNotificationActions: () => ({
        handleTap: vi.fn(),
        handleScan: vi.fn(),
    }),
}));

describe('useNotificationPanel', () => {
    it('resets active tab to forum when panel reopens after close', () => {
        const { result, rerender } = renderHook(
            ({ isOpen }: { isOpen: boolean }) =>
                useNotificationPanel(isOpen, 'user-1', vi.fn(), vi.fn()),
            { initialProps: { isOpen: true } },
        );

        act(() => {
            result.current.setActiveTab('system');
        });
        expect(result.current.activeTab).toBe('system');

        rerender({ isOpen: false });
        rerender({ isOpen: true });
        expect(result.current.activeTab).toBe('forum');
    });

    it('يجمّع البطاقات عندما listLive حتى لو isOpen=false', () => {
        const { result } = renderHook(() =>
            useNotificationPanel(false, 'user-1', vi.fn(), vi.fn(), true),
        );
        expect(result.current.groupedByTime.today).toHaveLength(1);
        expect(result.current.groupedByTime.today[0]?.id).toBe('n1');
    });

    it('لا يجمّع البطاقات عندما مغلقة بالكامل', () => {
        const { result } = renderHook(() =>
            useNotificationPanel(false, 'user-1', vi.fn(), vi.fn(), false),
        );
        expect(result.current.groupedByTime.today).toEqual([]);
        expect(result.current.groupedByTime.yesterday).toEqual([]);
        expect(result.current.groupedByTime.older).toEqual([]);
    });
});
