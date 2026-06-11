/**
 * اختبارات notificationStore.
 *
 * يتحقّق من:
 *  n1) addNotification يُضيف للقائمة ويُحدّث unreadCount
 *  n2) markAsRead يُحدّث isRead ويُنقص unreadCount
 *  n3) markAllAsRead يصفّر unreadCount
 *  n4) cap 200 — لا تتجاوز القائمة 200
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotificationStore } from '../notificationStore';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';

const persistMock = vi.fn().mockResolvedValue(undefined);
vi.mock('@/app/infrastructure/NotificationRepository', () => ({
    NotificationRepository: {
        fetchNotifications: vi.fn().mockResolvedValue([]),
        markAsRead: vi.fn().mockResolvedValue(undefined),
        markAllAsRead: vi.fn().mockResolvedValue(undefined),
        replaceAllNotifications: vi.fn().mockResolvedValue([]),
        addNotification: (...args: unknown[]) => persistMock(...args),
    },
    isActivityLogNotification: (n: { type?: string }) =>
        String(n?.type ?? '').startsWith('audit_log_'),
}));

function makeNotif(id: string, isRead = false): NotificationModel {
    return {
        id,
        title: `notif-${id}`,
        message: `body-${id}`,
        type: 'system_alert',
        isRead,
        createdAt: new Date().toISOString(),
    };
}

describe('notificationStore', () => {
    beforeEach(() => {
        persistMock.mockClear();
        useNotificationStore.setState({
            notifications: [],
            unreadCount: 0,
            isLoading: false,
            currentUserId: null,
        });
    });

    it('n1) addNotification يُضيف ويُحدّث unreadCount', () => {
        useNotificationStore.getState().addNotification(makeNotif('a'));
        useNotificationStore.getState().addNotification(makeNotif('b'));
        const state = useNotificationStore.getState();
        expect(state.notifications.length).toBe(2);
        expect(state.notifications[0]!.id).toBe('b'); // الأحدث في المقدمة
        expect(state.unreadCount).toBe(2);
    });

    it('n2) markAsRead يُنقص unreadCount', async () => {
        useNotificationStore.getState().addNotification(makeNotif('a'));
        useNotificationStore.getState().addNotification(makeNotif('b'));
        await useNotificationStore.getState().markAsRead('user-1', 'a');
        const state = useNotificationStore.getState();
        expect(state.unreadCount).toBe(1);
        const a = state.notifications.find((n) => n.id === 'a');
        expect(a?.isRead).toBe(true);
    });

    it('n3) markAllAsRead يصفّر unreadCount', async () => {
        useNotificationStore.getState().addNotification(makeNotif('a'));
        useNotificationStore.getState().addNotification(makeNotif('b'));
        useNotificationStore.getState().addNotification(makeNotif('c'));
        await useNotificationStore.getState().markAllAsRead('user-1');
        const state = useNotificationStore.getState();
        expect(state.unreadCount).toBe(0);
        expect(state.notifications.every((n) => n.isRead)).toBe(true);
    });

    it('n4) القائمة لا تتجاوز 200 (cap)', () => {
        const store = useNotificationStore.getState();
        for (let i = 0; i < 250; i++) {
            store.addNotification(makeNotif(`n-${i}`));
        }
        const state = useNotificationStore.getState();
        expect(state.notifications.length).toBe(200);
        // أحدث 200 (n-249 → n-50) — n-249 في المقدمة
        expect(state.notifications[0]!.id).toBe('n-249');
        expect(state.notifications[199]!.id).toBe('n-50');
    });

    it('n5) Persistence: addNotification يستدعي repository.addNotification عند تسجيل userId', () => {
        useNotificationStore.getState().setUserId('user-xyz');
        useNotificationStore.getState().addNotification(makeNotif('persist-1'));
        expect(persistMock).toHaveBeenCalledTimes(1);
        expect(persistMock).toHaveBeenCalledWith('user-xyz', expect.objectContaining({ id: 'persist-1' }));
    });

    it('n6) لا يستدعي persistence إن لم يكن هناك userId', () => {
        useNotificationStore.getState().addNotification(makeNotif('no-uid'));
        expect(persistMock).not.toHaveBeenCalled();
    });

    it('n7) Dedupe: لا يُضاف الإشعار مرّتين بنفس الـ id', () => {
        useNotificationStore.getState().addNotification(makeNotif('dup'));
        useNotificationStore.getState().addNotification(makeNotif('dup'));
        const state = useNotificationStore.getState();
        expect(state.notifications.length).toBe(1);
        expect(state.unreadCount).toBe(1);
    });
});
