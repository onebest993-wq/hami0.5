import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import SecureStoreService from '@/app/services/SecureStoreService';

// --- TYPES ---
export type NotificationType = 'deadline' | 'system_alert' | 'ai_insight' | 'new_document';

export interface NotificationModel {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    isRead: boolean;
    actionPayload?: Record<string, unknown>;
    createdAt: string;
}

const LOCAL_KEY_PREFIX = 'hami:notifications:v1:';

function getLocalKey(userId: string): string {
    return `${LOCAL_KEY_PREFIX}${userId}`;
}

function loadLocal(userId: string): NotificationModel[] {
    try {
        const raw = SecureStoreService.getItemSync(getLocalKey(userId));
        if (raw) {
            const parsed: unknown = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed as NotificationModel[];
        }
    } catch { /* ignore */ }
    return [];
}

function saveLocal(userId: string, list: NotificationModel[]) {
    try {
        SecureStoreService.setItemSync(getLocalKey(userId), JSON.stringify(list));
    } catch { /* ignore */ }
}

export const NotificationRepository = {

    fetchNotifications: async (userId: string): Promise<NotificationModel[]> => {
        if (import.meta.env.DEV) {
            return loadLocal(userId);
        }
        try {
            const data = await SecureAPIClient.fetchSecure(
                `https://${projectId}.supabase.co/functions/v1/make-server-f09713ba/kv-proxy`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${publicAnonKey}`,
                    },
                    body: JSON.stringify({ action: 'get', key: `notifications_${userId}` }),
                },
                '127.0.0.1',
            );

            const remote = Array.isArray(data) ? (data as NotificationModel[]) : [];

            if (remote.length > 0) {
                saveLocal(userId, remote);
                return remote;
            }

            const local = loadLocal(userId);
            return local;
        } catch {
            const local = loadLocal(userId);
            return local;
        }
    },

    markAsRead: async (userId: string, notificationId: string, currentList: NotificationModel[]) => {
        const updatedList = currentList.map(n =>
            n.id === notificationId ? { ...n, isRead: true } : n
        );

        saveLocal(userId, updatedList);

        if (import.meta.env.DEV) {
            return true;
        }
        try {
            await SecureAPIClient.fetchSecure(
                `https://${projectId}.supabase.co/functions/v1/make-server-f09713ba/kv-proxy`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${publicAnonKey}`,
                    },
                    body: JSON.stringify({
                        action: 'set',
                        key: `notifications_${userId}`,
                        value: updatedList,
                    }),
                },
                '127.0.0.1',
            );
            return true;
        } catch {
            return true;
        }
    },

    markAllAsRead: async (userId: string, currentList: NotificationModel[]) => {
        const updatedList = currentList.map(n => ({ ...n, isRead: true }));

        saveLocal(userId, updatedList);

        if (import.meta.env.DEV) {
            return true;
        }
        try {
            await SecureAPIClient.fetchSecure(
                `https://${projectId}.supabase.co/functions/v1/make-server-f09713ba/kv-proxy`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${publicAnonKey}`,
                    },
                    body: JSON.stringify({
                        action: 'set',
                        key: `notifications_${userId}`,
                        value: updatedList,
                    }),
                },
                '127.0.0.1',
            );
            return true;
        } catch {
            return true;
        }
    }
};
