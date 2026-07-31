import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import { isNotificationServerSyncEnabled } from '@/app/services/notifications/notificationServerSync';

type ReadStateResponse = {
    ok?: boolean;
    notifications?: NotificationModel[];
    error?: string;
};

type MergeResponse = {
    ok?: boolean;
    notifications?: NotificationModel[];
    error?: string;
};

export async function syncMarkReadClient(notificationId: string): Promise<NotificationModel[] | null> {
    if (!isNotificationServerSyncEnabled()) return null;

    try {
        const { SecureAPIClient } = await import('@/app/services/SecureAPIClient');
        const res = await SecureAPIClient.fetchSecure<ReadStateResponse>('/api/notifications/read-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'mark_read', notificationId }),
        });
        return res?.ok && Array.isArray(res.notifications) ? res.notifications : null;
    } catch {
        return null;
    }
}

export async function syncMarkAllReadClient(): Promise<NotificationModel[] | null> {
    if (!isNotificationServerSyncEnabled()) return null;

    try {
        const { SecureAPIClient } = await import('@/app/services/SecureAPIClient');
        const res = await SecureAPIClient.fetchSecure<ReadStateResponse>('/api/notifications/read-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'mark_all_read' }),
        });
        return res?.ok && Array.isArray(res.notifications) ? res.notifications : null;
    } catch {
        return null;
    }
}

export async function mergeNotificationsClient(
    notifications: NotificationModel[],
): Promise<NotificationModel[] | null> {
    if (!isNotificationServerSyncEnabled() || notifications.length === 0) return null;

    try {
        const { SecureAPIClient } = await import('@/app/services/SecureAPIClient');
        const res = await SecureAPIClient.fetchSecure<MergeResponse>('/api/notifications/merge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notifications }),
        });
        return res?.ok && Array.isArray(res.notifications) ? res.notifications : null;
    } catch {
        return null;
    }
}

type ListResponse = {
    ok?: boolean;
    notifications?: NotificationModel[];
    unreadCount?: number;
};

export async function fetchNotificationsClient(): Promise<NotificationModel[] | null> {
    if (!isNotificationServerSyncEnabled()) return null;

    try {
        const { SecureAPIClient } = await import('@/app/services/SecureAPIClient');
        const res = await SecureAPIClient.fetchSecure<ListResponse>('/api/notifications/list', {
            method: 'GET',
        });
        return res?.ok && Array.isArray(res.notifications) ? res.notifications : null;
    } catch {
        return null;
    }
}
