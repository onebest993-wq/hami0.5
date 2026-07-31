import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { NotificationModel } from '@/app/infrastructure/notificationModel';

const markAsRead = vi.fn(async () => undefined);
const onClose = vi.fn();
const onNavigate = vi.fn();

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/app/components/ui/SmartDialog', () => ({
    SmartDialog: { prompt: vi.fn(async () => null) },
}));

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: { fetchSecure: vi.fn() },
}));

import { useNotificationActions } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationActions';

const forumNotif: NotificationModel = {
    id: 'f1',
    title: 'رد',
    message: 'msg',
    type: 'forum_reply',
    isRead: false,
    createdAt: new Date().toISOString(),
    actionPayload: { postId: 'p1' },
};

describe('useNotificationActions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('handleTap يعلّم كمقروء وينتقل للمنتدى', async () => {
        const { result } = renderHook(() =>
            useNotificationActions('user-1', onClose, onNavigate, markAsRead),
        );

        await act(async () => {
            await result.current.handleTap(forumNotif);
        });

        expect(markAsRead).toHaveBeenCalledWith('user-1', 'f1');
        expect(onClose).toHaveBeenCalled();
        expect(onNavigate).toHaveBeenCalledWith('community', { postId: 'p1' });
    });

    it('handleScan يغلق اللوحة ويفتح مسح المستند', () => {
        const { result } = renderHook(() =>
            useNotificationActions('user-1', onClose, onNavigate, markAsRead),
        );

        const stopPropagation = vi.fn();
        act(() => {
            result.current.handleScan({ stopPropagation } as unknown as React.MouseEvent);
        });

        expect(stopPropagation).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
        expect(onNavigate).toHaveBeenCalledWith('scan_document', {});
    });
});
