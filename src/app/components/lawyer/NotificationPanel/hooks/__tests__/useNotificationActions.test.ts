import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { NotificationModel } from '@/app/infrastructure/notificationModel';

const markAsRead = vi.fn(async () => undefined);
const onClose = vi.fn();
const onNavigate = vi.fn();

const forumIntent = vi.hoisted(() => ({
    requestOpenLawyerForum: vi.fn(),
}));

vi.mock('@/app/runtime/forumOpenIntent', () => forumIntent);

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
        onClose.mockReset();
        onNavigate.mockReset();
        markAsRead.mockReset();
        markAsRead.mockResolvedValue(undefined);
        forumIntent.requestOpenLawyerForum.mockReset();
    });

    it('handleTap يفتح المنتدى بنية مباشرة ثم يغلق اللوحة', async () => {
        const callOrder: string[] = [];
        forumIntent.requestOpenLawyerForum.mockImplementation(() => {
            callOrder.push('forum');
        });
        onClose.mockImplementation(() => {
            callOrder.push('close');
        });

        const { result } = renderHook(() =>
            useNotificationActions('user-1', onClose, onNavigate, markAsRead),
        );

        await act(async () => {
            await result.current.handleTap(forumNotif);
        });

        expect(callOrder).toEqual(['forum', 'close']);
        expect(markAsRead).toHaveBeenCalledWith('user-1', 'f1');
        expect(forumIntent.requestOpenLawyerForum).toHaveBeenCalledWith('p1');
        expect(onNavigate).not.toHaveBeenCalled();
    });

    it('handleTap يعلّم كمقروء ويفتح المنتدى دون onNavigate', async () => {
        const { result } = renderHook(() =>
            useNotificationActions('user-1', onClose, onNavigate, markAsRead),
        );

        await act(async () => {
            await result.current.handleTap(forumNotif);
        });

        expect(markAsRead).toHaveBeenCalledWith('user-1', 'f1');
        expect(onClose).toHaveBeenCalled();
        expect(forumIntent.requestOpenLawyerForum).toHaveBeenCalledWith('p1');
        expect(onNavigate).not.toHaveBeenCalled();
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
