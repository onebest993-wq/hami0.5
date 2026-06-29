import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import { capNotificationList } from '@/app/services/notifications/notificationLimits';

function parseCreatedAt(value: string): number {
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : 0;
}

function payloadOf(n: NotificationModel): Record<string, unknown> {
    return n.actionPayload && typeof n.actionPayload === 'object' ? n.actionPayload : {};
}

/** سجل خادمي — يفوز على نسخة العميل عند التعارض (ما عدا isRead أحادي). */
export function isServerAppendedNotification(n: NotificationModel): boolean {
    return payloadOf(n).appendedBy === 'server';
}

/** دمج إشعارين بنفس المعرّف — isRead أحادي (true يفوز)، الخادم يفوز على المحتوى عند التعارض. */
export function mergeNotificationRecord(
    a: NotificationModel,
    b: NotificationModel,
): NotificationModel {
    const aServer = isServerAppendedNotification(a);
    const bServer = isServerAppendedNotification(b);

    if (aServer && !bServer) {
        return {
            ...a,
            isRead: a.isRead || b.isRead,
            actionPayload: { ...payloadOf(b), ...payloadOf(a) },
        };
    }
    if (bServer && !aServer) {
        return {
            ...b,
            isRead: a.isRead || b.isRead,
            actionPayload: { ...payloadOf(a), ...payloadOf(b) },
        };
    }

    const aTime = parseCreatedAt(a.createdAt);
    const bTime = parseCreatedAt(b.createdAt);
    const newer = bTime >= aTime ? b : a;
    const older = bTime >= aTime ? a : b;

    return {
        ...newer,
        title: newer.title || older.title,
        message: newer.message || older.message,
        isRead: a.isRead || b.isRead,
        actionPayload: { ...payloadOf(older), ...payloadOf(newer) },
    };
}

/** اتحاد قوائم — لا last-write-wins على isRead. */
export function mergeNotificationLists(...lists: NotificationModel[][]): NotificationModel[] {
    const byId = new Map<string, NotificationModel>();

    for (const list of lists) {
        for (const item of list) {
            const existing = byId.get(item.id);
            byId.set(item.id, existing ? mergeNotificationRecord(existing, item) : item);
        }
    }

    return Array.from(byId.values()).sort(
        (x, y) => parseCreatedAt(y.createdAt) - parseCreatedAt(x.createdAt),
    );
}

export function capMergedNotificationLists(...lists: NotificationModel[][]): NotificationModel[] {
    return capNotificationList(mergeNotificationLists(...lists));
}
