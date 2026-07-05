import { create } from 'zustand';
import {
    NotificationModel,
    NotificationRepository,
    isActivityLogNotification,
    deriveNotificationCategory,
    peekLocalNotifications,
} from '../infrastructure/NotificationRepository';
import { sanitizeNotificationDisplayMessage, isNavigationNoiseNotification } from '@/app/services/notificationMessageFormat';
import { isIncomingNotification } from '@/app/services/notificationIncomingFilter';
import { capNotificationList } from '@/app/services/notifications/notificationLimits';
import { capMergedNotificationLists, mergeNotificationRecord } from '@/app/services/notifications/notificationMerge';

function normalizeNotification(notification: NotificationModel): NotificationModel | null {
    if (isActivityLogNotification(notification)) return null;
    if (!isIncomingNotification(notification)) return null;
    if (isNavigationNoiseNotification(notification)) return null;
    const message = sanitizeNotificationDisplayMessage(notification);
    if (!message.trim()) return null;
    if (message === notification.message) return notification;
    return { ...notification, message };
}

function applyUpsertsToList(
    current: NotificationModel[],
    incoming: NotificationModel[],
): NotificationModel[] {
    let list = current;
    for (const raw of incoming) {
        if (isActivityLogNotification(raw)) continue;
        if (!isIncomingNotification(raw)) continue;
        const normalized = normalizeNotification(raw);
        if (!normalized) continue;

        const existing = list.find((n) => n.id === normalized.id);
        if (existing) {
            list = list.map((n) =>
                n.id === normalized.id ? mergeNotificationRecord(n, normalized) : n,
            );
        } else {
            list = [normalized, ...list];
        }
    }
    return capNotificationList(list);
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
    hasHydratedOnce: boolean;

    fetchNotifications: (userId: string) => Promise<void>;
    hydrateFromLocalPeek: (userId: string) => void;
    markAsRead: (
        userId: string,
        notificationId: string,
        options?: { skipForumPersist?: boolean },
    ) => Promise<void>;
    markAllAsRead: (userId: string, options?: { skipForumPersist?: boolean }) => Promise<void>;
    markForumNotificationsRead: (
        userId: string,
        options?: { skipForumPersist?: boolean },
    ) => Promise<void>;
    removeNotification: (notificationId: string) => void;
    addNotification: (notification: NotificationModel) => void;
    upsertNotification: (notification: NotificationModel) => void;
    upsertNotifications: (notifications: NotificationModel[]) => void;
    setUserId: (userId: string | null) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    currentUserId: null,
    hasHydratedOnce: false,

    setUserId: (userId) => {
        const prev = get().currentUserId;
        if (prev === userId) return;
        set({
            currentUserId: userId,
            notifications: [],
            unreadCount: 0,
            isLoading: false,
            hasHydratedOnce: false,
        });
    },

    hydrateFromLocalPeek: (userId: string) => {
        const state = get();
        if (state.currentUserId === userId && state.notifications.length > 0) return;
        const list = stripInvalidNotifications(capNotificationList(peekLocalNotifications(userId)));
        if (list.length === 0) return;
        const unread = list.filter((n) => !n.isRead).length;
        set({
            currentUserId: userId,
            notifications: list,
            unreadCount: unread,
            hasHydratedOnce: true,
            isLoading: false,
        });
    },

    fetchNotifications: async (userId: string) => {
        const prevUserId = get().currentUserId;
        const sameUser = prevUserId === userId;
        const hadCached = sameUser && get().notifications.length > 0;
        const hasHydratedOnce = sameUser && get().hasHydratedOnce;
        if (!sameUser) {
            set({ notifications: [], unreadCount: 0, currentUserId: userId, hasHydratedOnce: false });
        } else {
            set({ currentUserId: userId });
        }
        if (!hadCached && !hasHydratedOnce) {
            set({ isLoading: true });
        }
        const raw = await NotificationRepository.fetchNotifications(userId);
        const list = stripInvalidNotifications(raw);

        if (list.length !== raw.length) {
            void NotificationRepository.replaceAllNotifications(userId, list);
        }

        const current = get().notifications;
        const merged = stripInvalidNotifications(capMergedNotificationLists(list, current));
        const capped = capNotificationList(merged);
        const unread = capped.filter((n) => !n.isRead).length;

        set({ notifications: capped, unreadCount: unread, isLoading: false, hasHydratedOnce: true });
    },

    markAsRead: async (userId: string, notificationId: string, options?: { skipForumPersist?: boolean }) => {
        const { notifications } = get();
        const target = notifications.find((n) => n.id === notificationId);
        if (!target) return;

        const updatedList = notifications.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n,
        );
        const unread = updatedList.filter((n) => !n.isRead).length;

        set({ notifications: updatedList, unreadCount: unread });

        await NotificationRepository.markAsRead(userId, notificationId, updatedList);

        if (!options?.skipForumPersist && deriveNotificationCategory(target) === 'forum') {
            const { syncShellReadToForum } = await import(
                '@/app/services/notifications/notificationReadSync'
            );
            void syncShellReadToForum(userId, notificationId);
        }
    },

    markForumNotificationsRead: async (userId: string, options?: { skipForumPersist?: boolean }) => {
        const { notifications } = get();
        const updatedList = notifications.map((n) =>
            deriveNotificationCategory(n) === 'forum' ? { ...n, isRead: true } : n,
        );
        const unread = updatedList.filter((n) => !n.isRead).length;

        set({ notifications: updatedList, unreadCount: unread });
        await NotificationRepository.saveNotifications(userId, updatedList);

        if (!options?.skipForumPersist) {
            const { syncShellMarkAllReadToForum } = await import(
                '@/app/services/notifications/notificationReadSync'
            );
            void syncShellMarkAllReadToForum(userId);
        }
    },

    markAllAsRead: async (userId: string, options?: { skipForumPersist?: boolean }) => {
        const { notifications } = get();

        const updatedList = notifications.map((n) => ({ ...n, isRead: true }));

        set({ notifications: updatedList, unreadCount: 0 });

        await NotificationRepository.markAllAsRead(userId, updatedList);

        if (!options?.skipForumPersist) {
            const hasForum = notifications.some((n) => deriveNotificationCategory(n) === 'forum');
            if (hasForum) {
                const { syncShellMarkAllReadToForum } = await import(
                    '@/app/services/notifications/notificationReadSync'
                );
                void syncShellMarkAllReadToForum(userId);
            }
        }
    },

    removeNotification: (notificationId: string) => {
        const { notifications, currentUserId } = get();
        const updated = notifications.filter((n) => n.id !== notificationId);
        if (updated.length === notifications.length) return;

        set({
            notifications: updated,
            unreadCount: updated.filter((n) => !n.isRead).length,
        });

        if (currentUserId) {
            void NotificationRepository.saveNotifications(currentUserId, updated);
        }
    },

    addNotification: (notification: NotificationModel) => {
        if (isActivityLogNotification(notification)) return;
        if (!isIncomingNotification(notification)) return;
        const normalized = normalizeNotification(notification);
        if (!normalized) return;
        const { notifications, currentUserId } = get();
        if (notifications.some((n) => n.id === normalized.id)) return;
        const updated = [normalized, ...notifications];
        const capped = capNotificationList(updated);
        set({
            notifications: capped,
            unreadCount: capped.filter((n) => !n.isRead).length,
        });

        if (currentUserId) {
            void NotificationRepository.addNotification(currentUserId, normalized).then(
                (authoritative) => {
                    if (!authoritative) return;
                    const state = get();
                    let list = state.notifications;
                    if (authoritative.id !== normalized.id) {
                        list = list.filter((n) => n.id !== normalized.id);
                    }
                    const next = applyUpsertsToList(list, [authoritative]);
                    set({
                        notifications: next,
                        unreadCount: next.filter((n) => !n.isRead).length,
                    });
                },
            );
        }
    },

    upsertNotification: (notification: NotificationModel) => {
        get().upsertNotifications([notification]);
    },

    upsertNotifications: (incoming: NotificationModel[]) => {
        if (incoming.length === 0) return;
        const { notifications, currentUserId } = get();
        const capped = applyUpsertsToList(notifications, incoming);

        set({
            notifications: capped,
            unreadCount: capped.filter((n) => !n.isRead).length,
        });

        if (currentUserId) {
            void NotificationRepository.saveNotifications(currentUserId, capped);
        }
    },
}));

if (import.meta.env.DEV && typeof window !== 'undefined') {
    const w = window as Window & {
        __hamiE2ePushNotification?: (partial: {
            id: string;
            title: string;
            message: string;
            type?: NotificationModel['type'];
            isRead?: boolean;
            createdAt?: string;
            actionPayload?: Record<string, unknown>;
        }) => void;
        __hamiE2eNotificationsLoading?: () => boolean;
    };
    w.__hamiE2ePushNotification = (partial) => {
        useNotificationStore.getState().addNotification({
            type: partial.type ?? 'forum_reply',
            isRead: partial.isRead ?? false,
            createdAt: partial.createdAt ?? new Date().toISOString(),
            actionPayload: partial.actionPayload ?? {},
            ...partial,
        });
    };
    w.__hamiE2eNotificationsLoading = () => useNotificationStore.getState().isLoading;
}
