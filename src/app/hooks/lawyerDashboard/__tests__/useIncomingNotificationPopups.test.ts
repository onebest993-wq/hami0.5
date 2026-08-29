import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useIncomingNotificationPopups } from '../useIncomingNotificationPopups';
import { resetIncomingNotificationPopupMemoryForTests } from '../incomingNotificationPopupMemory';
import { useNotificationStore } from '@/app/stores/notificationStore';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';

vi.mock('@/app/services/settings/builtInBehavior', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/settings/builtInBehavior')>();
    return {
        ...actual,
        BUILTIN_NOTIFICATIONS_ENABLED: true,
    };
});

vi.mock('@/app/services/notifications/notificationArrivalSound', () => ({
    playNotificationArrivalCue: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/app/services/notifications/notificationAlertPolicy', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@/app/services/notifications/notificationAlertPolicy')>();
    return {
        ...actual,
        shouldShowChannelInApp: () => true,
    };
});

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
        resetIncomingNotificationPopupMemoryForTests();
        useNotificationStore.setState({
            notifications: [],
            unreadCount: 0,
            isLoading: true,
            hasHydratedOnce: false,
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

    it('يُظهر منبثقاً جديداً أثناء التحميل بعد خط أساس من الكاش', () => {
        useNotificationStore.setState({
            notifications: [makeNotif('baseline')],
            isLoading: true,
            hasHydratedOnce: true,
        });

        const { result, rerender } = renderHook(() =>
            useIncomingNotificationPopups({ userId: 'user-1', isPanelOpen: false }),
        );
        rerender();

        act(() => {
            useNotificationStore.setState({
                isLoading: true,
                notifications: [makeNotif('fresh'), makeNotif('baseline')],
            });
        });
        rerender();

        expect(result.current.queue.map((q) => q.id)).toContain('fresh');
    });

    it('يُظهر منبثقاً للإشعار الجديد بعد التحميل الأول', () => {
        const { result, rerender } = renderHook(
            ({ isOpen }) => useIncomingNotificationPopups({ userId: 'user-1', isPanelOpen: isOpen }),
            { initialProps: { isOpen: false } },
        );

        act(() => {
            useNotificationStore.setState({
                isLoading: false,
                hasHydratedOnce: true,
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
                hasHydratedOnce: true,
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
                hasHydratedOnce: true,
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

    it('إعادة التركيب لا تبتلع إشعاراً جديداً كخط أساس', () => {
        const first = renderHook(() =>
            useIncomingNotificationPopups({ userId: 'user-1', isPanelOpen: false }),
        );

        act(() => {
            useNotificationStore.setState({
                isLoading: false,
                hasHydratedOnce: true,
                notifications: [makeNotif('baseline')],
            });
        });
        first.rerender();
        first.unmount();

        const second = renderHook(() =>
            useIncomingNotificationPopups({ userId: 'user-1', isPanelOpen: false }),
        );
        act(() => {
            useNotificationStore.setState({
                notifications: [makeNotif('fresh-after-remount'), makeNotif('baseline')],
            });
        });
        second.rerender();

        expect(second.result.current.queue.map((q) => q.id)).toContain('fresh-after-remount');
    });
});
