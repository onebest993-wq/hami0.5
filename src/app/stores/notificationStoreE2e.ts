import type { NotificationModel } from '@/app/infrastructure/notificationModel';
import { capNotificationList } from '@/app/services/notifications/notificationLimits';
import {
    stripInvalidNotifications,
    unreadCountOf,
} from '@/app/stores/notificationStoreList';

export type E2eInboxSeedItem = {
    id: string;
    title: string;
    message: string;
    type?: NotificationModel['type'];
    category?: NotificationModel['category'];
    direction?: NotificationModel['direction'];
    isRead?: boolean;
    createdAt?: string;
    actionPayload?: Record<string, unknown>;
};

type NotificationStoreE2eHandle = {
    getState: () => {
        currentUserId: string | null;
        isLoading: boolean;
        addNotification: (notification: NotificationModel) => void;
    };
    setState: (partial: {
        currentUserId?: string | null;
        notifications?: NotificationModel[];
        unreadCount?: number;
        hasHydratedOnce?: boolean;
        isLoading?: boolean;
        lastFetchedAt?: number;
    }) => void;
};

/**
 * بذرة وارد E2E عبر مسار التطبيق (zustand + SecureStore) — لا كتابة IDB خلف ظهر الكاش.
 * الصادرات تُصفَّى كالعرض الحقيقي.
 */
export function applyE2eInboxSeedToStore(
    store: NotificationStoreE2eHandle,
    items: E2eInboxSeedItem[],
    userId?: string | null,
): number {
    const existing = store.getState().currentUserId?.trim() || null;
    const uid = existing || userId?.trim() || null;
    const models: NotificationModel[] = items.map((item) => ({
        id: item.id,
        title: item.title,
        message: item.message,
        type: item.type ?? 'forum_reply',
        category: item.category,
        direction: item.direction ?? 'incoming',
        isRead: item.isRead ?? false,
        createdAt: item.createdAt ?? new Date().toISOString(),
        actionPayload: item.actionPayload ?? {},
    }));
    const list = stripInvalidNotifications(capNotificationList(models));
    const unread = unreadCountOf(list);
    store.setState({
        ...(uid ? { currentUserId: uid } : {}),
        notifications: list,
        unreadCount: unread,
        hasHydratedOnce: true,
        isLoading: false,
        lastFetchedAt: Date.now(),
    });
    if (uid) {
        const payload = JSON.stringify(list);
        void import('@/app/services/SecureStoreService')
            .then((m) => m.default.setItem(`hami:notifications:v1:${uid}`, payload))
            .catch(() => undefined);
    }
    return list.length;
}

export function installNotificationStoreE2eHooks(store: NotificationStoreE2eHandle): void {
    if (typeof window === 'undefined') return;
    const w = window as Window & {
        __hamiE2ePushNotification?: (partial: {
            id: string;
            title: string;
            message: string;
            type?: NotificationModel['type'];
            isRead?: boolean;
            createdAt?: string;
            actionPayload?: Record<string, unknown>;
            direction?: NotificationModel['direction'];
        }) => void;
        __hamiE2eSeedInbox?: (items: E2eInboxSeedItem[], userId?: string | null) => number;
        __hamiE2eNotificationsLoading?: () => boolean;
    };
    w.__hamiE2ePushNotification = (partial) => {
        store.getState().addNotification({
            type: partial.type ?? 'forum_reply',
            direction: 'incoming',
            isRead: partial.isRead ?? false,
            createdAt: partial.createdAt ?? new Date().toISOString(),
            actionPayload: partial.actionPayload ?? {},
            ...partial,
        });
    };
    w.__hamiE2eSeedInbox = (items, userId) => applyE2eInboxSeedToStore(store, items, userId);
    w.__hamiE2eNotificationsLoading = () => store.getState().isLoading;
}
