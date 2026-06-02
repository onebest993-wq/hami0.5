import { create } from 'zustand';
import { NotificationModel, NotificationRepository } from '../infrastructure/NotificationRepository';

interface NotificationState {
    notifications: NotificationModel[];
    unreadCount: number;
    isLoading: boolean;
    /**
     * userId الحالي — يُسجَّل عند أول fetch ويُستخدم لاحقاً للحفاظ على persistence
     * في addNotification (سواء جاء من AuditLog أو من مصدر آخر).
     */
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
        const list = await NotificationRepository.fetchNotifications(userId);

        // دمج بدلاً من الاستبدال: حافظ على الإشعارات في الذاكرة (المضافة لتوّها عبر AuditLog)
        // التي قد تكون أحدث من ما في storage.
        const current = get().notifications;
        const byId = new Map<string, NotificationModel>();
        // ابدأ بـ remote (مصدر الحقيقة)
        for (const n of list) byId.set(n.id, n);
        // ثم أضف الإشعارات في الذاكرة التي لم تصل إلى storage بعد
        for (const n of current) {
            if (!byId.has(n.id)) byId.set(n.id, n);
        }
        const merged = Array.from(byId.values()).sort((a, b) => {
            const ta = new Date(a.createdAt).getTime();
            const tb = new Date(b.createdAt).getTime();
            return tb - ta;
        });
        const capped = merged.length > 400 ? merged.slice(0, 400) : merged;
        const unread = capped.filter(n => !n.isRead).length;

        set({ notifications: capped, unreadCount: unread, isLoading: false });
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
        const { notifications, currentUserId } = get();
        // Dedupe على الـ id داخل الذاكرة (لا تكرار)
        if (notifications.some(n => n.id === notification.id)) return;
        const updated = [notification, ...notifications];
        const capped = updated.length > 200 ? updated.slice(0, 200) : updated;
        set({
            notifications: capped,
            unreadCount: capped.filter(n => !n.isRead).length
        });

        // 🔑 Persistence: احفظ في local storage فوراً حتى لا يضيع عند fetchNotifications التالي
        if (currentUserId) {
            void NotificationRepository.addNotification(currentUserId, notification);
        }
    }
}));
