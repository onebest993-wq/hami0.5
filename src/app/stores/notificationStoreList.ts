import {
    type NotificationModel,
    isActivityLogNotification,
} from '@/app/infrastructure/notificationModel';
import { sanitizeNotificationDisplayMessage, isNavigationNoiseNotification } from '@/app/services/notificationMessageFormat';
import { mergeSanitizedNotificationActionPayload } from '@/app/services/notifications/notificationNavigateSecurity';
import { isIncomingNotification } from '@/app/services/notificationIncomingFilter';
import { capNotificationList } from '@/app/services/notifications/notificationLimits';
import { mergeNotificationRecord } from '@/app/services/notifications/notificationMerge';

export function normalizeNotification(notification: NotificationModel): NotificationModel | null {
    if (isActivityLogNotification(notification)) return null;
    if (!isIncomingNotification(notification)) return null;
    if (isNavigationNoiseNotification(notification)) return null;
    const message = sanitizeNotificationDisplayMessage(notification);
    if (!message.trim()) return null;
    const actionPayload = mergeSanitizedNotificationActionPayload(notification.actionPayload ?? {});
    const payloadUnchanged =
        JSON.stringify(actionPayload) === JSON.stringify(notification.actionPayload ?? {});
    if (message === notification.message && payloadUnchanged) return notification;
    return { ...notification, message, actionPayload };
}

export function unreadCountOf(list: NotificationModel[]): number {
    let unread = 0;
    for (const item of list) {
        if (!item.isRead) unread += 1;
    }
    return unread;
}

export function applyUpsertsToList(
    current: NotificationModel[],
    incoming: NotificationModel[],
): NotificationModel[] {
    if (incoming.length === 0) return current;

    const indexById = new Map<string, number>();
    for (let i = 0; i < current.length; i++) {
        indexById.set(current[i]!.id, i);
    }

    let list: NotificationModel[] | null = null;
    const ensureCopy = (): NotificationModel[] => {
        if (!list) list = current.slice();
        return list;
    };

    for (const raw of incoming) {
        if (isActivityLogNotification(raw)) continue;
        if (!isIncomingNotification(raw)) continue;
        const normalized = normalizeNotification(raw);
        if (!normalized) continue;

        const idx = indexById.get(normalized.id);
        if (idx !== undefined) {
            const existing = (list ?? current)[idx]!;
            const merged = mergeNotificationRecord(existing, normalized);
            if (merged !== existing) {
                ensureCopy()[idx] = merged;
            }
        } else {
            const next = ensureCopy();
            next.unshift(normalized);
            indexById.clear();
            for (let i = 0; i < next.length; i++) {
                indexById.set(next[i]!.id, i);
            }
        }
    }

    return list ? capNotificationList(list) : current;
}

export function stripInvalidNotifications(list: NotificationModel[]): NotificationModel[] {
    return list
        .filter((n) => !isActivityLogNotification(n) && isIncomingNotification(n) && !isNavigationNoiseNotification(n))
        .map((n) => normalizeNotification(n))
        .filter((n): n is NotificationModel => n != null);
}
