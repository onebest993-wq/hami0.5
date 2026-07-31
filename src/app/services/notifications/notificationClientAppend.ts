import type {
    NotificationCategory,
    NotificationModel,
    NotificationType,
} from '@/app/infrastructure/NotificationRepository';
import { isNotificationServerSyncEnabled } from '@/app/services/notifications/notificationServerSync';

export type ClientAppendInput = {
    title: string;
    message: string;
    type: NotificationType;
    category?: NotificationCategory;
    dedupeKey?: string;
    actionPayload?: Record<string, unknown>;
};

type AppendResponse = { ok?: boolean; notification?: NotificationModel; error?: string };

/** إلحاق إشعار وارد عبر الخادم — append-only، طابع زمني خادمي. */
export async function appendNotificationClient(input: ClientAppendInput): Promise<NotificationModel | null> {
    if (!isNotificationServerSyncEnabled() || typeof window === 'undefined') return null;

    try {
        const { SecureAPIClient } = await import('@/app/services/SecureAPIClient');
        const res = await SecureAPIClient.fetchSecure<AppendResponse>('/api/notifications/append', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: input.title,
                message: input.message,
                type: input.type,
                category: input.category,
                dedupeKey: input.dedupeKey,
                actionPayload: input.actionPayload,
            }),
        });
        if (res?.ok && res.notification) return res.notification;
        return null;
    } catch {
        return null;
    }
}

export function notificationFromAppendInput(
    input: ClientAppendInput,
    id: string,
    createdAt: string,
): NotificationModel {
    return {
        id,
        title: input.title,
        message: input.message,
        type: input.type,
        category: input.category,
        direction: 'incoming',
        isRead: false,
        actionPayload: {
            ...(input.actionPayload ?? {}),
            ...(input.dedupeKey ? { dedupeKey: input.dedupeKey } : {}),
        },
        createdAt,
    };
}
