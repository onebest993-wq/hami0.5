import type { ForumNotification } from '@/app/services/forum/forumTypes';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import {
    clampNotificationInboxText,
    MAX_NOTIFICATION_MESSAGE_LEN,
    MAX_NOTIFICATION_TITLE_LEN,
} from '@/app/services/notifications/notificationInboxSanitize';
import {
    sanitizeNotificationActionPayload,
    sanitizeNotificationEntityId,
} from '@/app/services/notifications/notificationNavigateSecurity';
import { sendFcmInboxPushServer } from './fcmServerSend.server';

function clampPushText(value: string, max: number): string {
    return clampNotificationInboxText(value, max);
}

export async function dispatchFcmForForumNotification(notif: ForumNotification): Promise<void> {
    if (!notif.userId?.trim() || notif.read) return;
    const postId = sanitizeNotificationEntityId(notif.postId);
    const notificationId = sanitizeNotificationEntityId(notif.id);
    await sendFcmInboxPushServer({
        userId: notif.userId,
        title: clampPushText(notif.title, MAX_NOTIFICATION_TITLE_LEN),
        body: clampPushText(notif.message, MAX_NOTIFICATION_MESSAGE_LEN),
        channel: 'community',
        data: {
            type: notif.type,
            ...(postId ? { postId } : {}),
            ...(notificationId ? { notificationId } : {}),
            path: 'community',
        },
    });
}

export async function dispatchFcmForShellNotification(
    userId: string,
    notif: Pick<NotificationModel, 'title' | 'message' | 'category' | 'type' | 'id' | 'actionPayload'>,
): Promise<void> {
    const category = notif.category ?? 'system';
    if (category !== 'forum' && category !== 'system') return;

    const channel = category === 'forum' ? 'community' : 'secretary';
    const payload = sanitizeNotificationActionPayload(notif.actionPayload ?? {});
    const notificationId = sanitizeNotificationEntityId(notif.id);
    const postId = typeof payload.postId === 'string' ? payload.postId : undefined;
    const data: Record<string, string> = {
        type: notif.type,
    };
    if (notificationId) data.notificationId = notificationId;
    if (postId) data.postId = postId;
    if (category === 'forum') {
        data.path = 'community';
    }

    await sendFcmInboxPushServer({
        userId,
        title: clampPushText(notif.title, MAX_NOTIFICATION_TITLE_LEN),
        body: clampPushText(notif.message, MAX_NOTIFICATION_MESSAGE_LEN),
        channel,
        data,
    });
}
