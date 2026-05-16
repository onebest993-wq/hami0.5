import { create } from 'zustand';
import { NotificationModel, NotificationRepository } from '../infrastructure/NotificationRepository';

interface NotificationState {
    notifications: NotificationModel[];
    unreadCount: number;
    isLoading: boolean;

    fetchNotifications: (userId: string) => Promise<void>;
    markAsRead: (userId: string, notificationId: string) => Promise<void>;
    markAllAsRead: (userId: string) => Promise<void>;
    addNotification: (notification: NotificationModel) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,

    fetchNotifications: async (userId: string) => {
        set({ isLoading: true });
        const list = await NotificationRepository.fetchNotifications(userId);

        const unread = list.filter(n => !n.isRead).length;

        set({ notifications: list, unreadCount: unread, isLoading: false });
    },

    markAsRead: async (userId: string, notificationId: string) => {
        const { notifications } = get();

        const updatedList = notifications.map(n =>
            n.id === notificationId ? { ...n, isRead: true } : n
        );
        const unread = updatedList.filter(n => !n.isRead).length;

        set({ notifications: updatedList, unreadCount: unread });

        await NotificationRepository.markAsRead(userId, notificationId, notifications);
    },

    markAllAsRead: async (userId: string) => {
        const { notifications } = get();

        const updatedList = notifications.map(n => ({ ...n, isRead: true }));

        set({ notifications: updatedList, unreadCount: 0 });

        await NotificationRepository.markAllAsRead(userId, notifications);
    },

    addNotification: (notification: NotificationModel) => {
        const { notifications } = get();
        const updated = [notification, ...notifications];
        const capped = updated.length > 200 ? updated.slice(0, 200) : updated;
        set({
            notifications: capped,
            unreadCount: capped.filter(n => !n.isRead).length
        });
    }
}));
