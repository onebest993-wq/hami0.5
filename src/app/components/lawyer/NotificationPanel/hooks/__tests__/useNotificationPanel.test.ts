import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotificationPanel } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationPanel';

vi.mock('@/app/stores/notificationStore', () => ({
    useNotificationStore: (selector: (s: unknown) => unknown) =>
        selector({
            notifications: [],
            unreadCount: 0,
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
        handleClientRequest: vi.fn(),
    }),
}));

describe('useNotificationPanel', () => {
    it('resets active tab to forum when panel session key changes', () => {
        const { result, rerender } = renderHook(
            ({ sessionKey }: { sessionKey: number }) =>
                useNotificationPanel(true, 'user-1', sessionKey, vi.fn(), vi.fn()),
            { initialProps: { sessionKey: 1 } },
        );

        act(() => {
            result.current.setActiveTab('system');
        });
        expect(result.current.activeTab).toBe('system');

        rerender({ sessionKey: 2 });
        expect(result.current.activeTab).toBe('forum');
    });
});
