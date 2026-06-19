import { create } from 'zustand';
import {
    NotificationModel,
    NotificationRepository,
    isActivityLogNotification,
} from '../infrastructure/NotificationRepository';
import { sanitizeNotificationDisplayMessage, isNavigationNoiseNotification } from '@/app/services/notificationMessageFormat';
import { isIncomingNotification } from '@/app/services/notificationIncomingFilter';

function normalizeNotification(notification: NotificationModel): NotificationModel | null {
    if (isActivityLogNotification(notification)) return null;
    if (!isIncomingNotification(notification)) return null;
    if (isNavigationNoiseNotification(notification)) return null;
    const message = sanitizeNotificationDisplayMessage(notification);
    if (!message.trim()) return null;
    if (message === notification.message) return notification;
    return { ...notification, message };
}

function stripInvalidNotifications(list: NotificationModel[]): NotificationModel[] {
    return list
        .filter((n) => !isActivityLogNotification(n) && isIncomingNotification(n) && !isNavigationNoiseNotification(n))
        .map((n) => normalizeNotification(n))
        .filter((n): n is NotificationModel => n != null);
}

interface NotificationState {
    notifications: NotificationModel[];
    unreadCount: number;
    isLoading: boolean;
    currentUserId: string | null;

    fetchNotifications: (userId: string) => Promise<void>;
    markAsRead: (userId: string, notificationId: string) => Promise<void>;
    markAllAsRead: (userId: string) => Promise<void>;
    addNotification: (notification: NotificationModel) => void;
    setUserId: (userId: string | null) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    currentUserId: null,

    setUserId: (userId) => {
        const prev = get().currentUserId;
        if (prev !== userId) set({ currentUserId: userId });
    },

    fetchNotifications: async (userId: string) => {
        set({ isLoading: true, currentUserId: userId });
        const raw = await NotificationRepository.fetchNotifications(userId);
        const list = stripInvalidNotifications(raw);

        if (list.length !== raw.length) {
            void NotificationRepository.replaceAllNotifications(userId, list);
        }

        const current = get().notifications;
        const byId = new Map<string, NotificationModel>();
        for (const n of list) byId.set(n.id, n);
        for (const n of current) {
            if (!byId.has(n.id)) {
                const normalized = normalizeNotification(n);
                if (normalized) byId.set(n.id, normalized);
            }
        }
        const merged = stripInvalidNotifications(Array.from(byId.values())).sort((a, b) => {
            const ta = new Date(a.createdAt).getTime();
            const tb = new Date(b.createdAt).getTime();
            return tb - ta;
        });
        const capped = merged.length > 400 ? merged.slice(0, 400) : merged;
        const unread = capped.filter((n) => !n.isRead).length;

        set({ notifications: capped, unreadCount: unread, isLoading: false });
    },

    markAsRead: async (userId: string, notificationId: string) => {
        const { notifications } = get();

        const updatedList = notifications.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n,
        );
        const unread = updatedList.filter((n) => !n.isRead).length;

        set({ notifications: updatedList, unreadCount: unread });

        await NotificationRepository.markAsRead(userId, notificationId, notifications);
    },

    markAllAsRead: async (userId: string) => {
        const { notifications } = get();

        const updatedList = notifications.map((n) => ({ ...n, isRead: true }));

        set({ notifications: updatedList, unreadCount: 0 });

        await NotificationRepository.markAllAsRead(userId, notifications);
    },

    addNotification: (notification: NotificationModel) => {
        if (isActivityLogNotification(notification)) return;
        if (!isIncomingNotification(notification)) return;
        const normalized = normalizeNotification(notification);
        if (!normalized) return;
        const { notifications, currentUserId } = get();
        if (notifications.some((n) => n.id === normalized.id)) return;
        const updated = [normalized, ...notifications];
        const capped = updated.length > 200 ? updated.slice(0, 200) : updated;
        set({
            notifications: capped,
            unreadCount: capped.filter((n) => !n.isRead).length,
        });

        if (currentUserId) {
            void NotificationRepository.addNotification(currentUserId, normalized);
        }
    },
}));
