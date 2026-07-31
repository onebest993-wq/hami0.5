import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useIncomingNotificationPopups } from '../useIncomingNotificationPopups';
import { useNotificationStore } from '@/app/stores/notificationStore';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';

vi.mock('@/app/services/settings/builtInBehavior', () => ({
    BUILTIN_NOTIFICATIONS_ENABLED: true,
}));

function makeNotif(id: string): NotificationModel {
    return {
        id,
        title: `عنوان ${id}`,
        message: `رسالة ${id}`,
        type: 'forum_reply',
        isRead: false,
        createdAt: new Date().toISOString(),
        actionPayload: {},
    };
}

describe('useIncomingNotificationPopups', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        useNotificationStore.setState({
            notifications: [],
            unreadCount: 0,
            isLoading: true,
            currentUserId: 'user-1',
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('لا يُظهر منبثقات قبل اكتمال التحميل الأول', () => {
        useNotificationStore.setState({
            notifications: [makeNotif('a')],
            isLoading: true,
        });

        const { result } = renderHook(() =>
            useIncomingNotificationPopups({ userId: 'user-1', isPanelOpen: false }),
        );

        expect(result.current.queue).toHaveLength(0);
    });

    it('يُظهر منبثقاً للإشعار الجديد بعد التحميل الأول', () => {
        const { result, rerender } = renderHook(
            ({ isOpen }) => useIncomingNotificationPopups({ userId: 'user-1', isPanelOpen: isOpen }),
            { initialProps: { isOpen: false } },
        );

        act(() => {
            useNotificationStore.setState({
                isLoading: false,
                notifications: [makeNotif('baseline')],
            });
        });
        rerender({ isOpen: false });

        act(() => {
            useNotificationStore.setState({
                notifications: [makeNotif('fresh'), makeNotif('baseline')],
            });
        });
        rerender({ isOpen: false });

        expect(result.current.queue.map((q) => q.id)).toContain('fresh');
    });

    it('يُفرّغ الطابور عند فتح اللوحة', () => {
        const { result, rerender } = renderHook(
            ({ isOpen }) => useIncomingNotificationPopups({ userId: 'user-1', isPanelOpen: isOpen }),
            { initialProps: { isOpen: false } },
        );

        act(() => {
            useNotificationStore.setState({
                isLoading: false,
                notifications: [makeNotif('x')],
            });
        });
        rerender({ isOpen: false });

        act(() => {
            useNotificationStore.setState({
                notifications: [makeNotif('new-1'), makeNotif('x')],
            });
        });
        rerender({ isOpen: false });
        expect(result.current.queue.length).toBeGreaterThan(0);

        rerender({ isOpen: true });
        expect(result.current.queue).toHaveLength(0);
    });

    it('dismiss يزيل عنصراً من الطابور', () => {
        const { result, rerender } = renderHook(() =>
            useIncomingNotificationPopups({ userId: 'user-1', isPanelOpen: false }),
        );

        act(() => {
            useNotificationStore.setState({
                isLoading: false,
                notifications: [],
            });
        });
        rerender();

        act(() => {
            useNotificationStore.setState({
                notifications: [makeNotif('pop-1')],
            });
        });
        rerender();

        const id = result.current.queue[0]?.id;
        expect(id).toBe('pop-1');

        act(() => result.current.dismiss('pop-1'));
        expect(result.current.queue).toHaveLength(0);
    });
});
