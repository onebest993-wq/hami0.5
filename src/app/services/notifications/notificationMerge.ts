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

function shallowEqualPayload(a?: Record<string, unknown>, b?: Record<string, unknown>): boolean {
    if (a === b) return true;
    const av = a ?? {};
    const bv = b ?? {};
    const aKeys = Object.keys(av);
    if (aKeys.length !== Object.keys(bv).length) return false;
    return aKeys.every((k) => Object.is(av[k], bv[k]));
}

/** يقارن محتوى سجلّين — يُستخدم لتفادي إنشاء مرجع جديد عند غياب أي تغيير فعلي. */
function isSameNotificationContent(x: NotificationModel, y: NotificationModel): boolean {
    return (
        x.id === y.id &&
        x.title === y.title &&
        x.message === y.message &&
        x.type === y.type &&
        x.category === y.category &&
        x.direction === y.direction &&
        x.isRead === y.isRead &&
        x.createdAt === y.createdAt &&
        shallowEqualPayload(x.actionPayload, y.actionPayload)
    );
}

/**
 * دمج إشعارين بنفس المعرّف — isRead أحادي (true يفوز)، الخادم يفوز على المحتوى عند التعارض.
 * يُعيد نفس مرجع `a` حرفياً عندما لا يُحدث الدمج أي تغيير فعلي — ضروري لاستقرار مراجع
 * notifications في الـ store ومنع إعادة رندر لا نهائية عند إعادة مزامنة بيانات مطابقة
 * (مثال: منتدى ↔ لوحة الجرس عبر syncForumNotificationsToAppStore على كل نبضة مزامنة).
 */
export function mergeNotificationRecord(
    a: NotificationModel,
    b: NotificationModel,
): NotificationModel {
    const aServer = isServerAppendedNotification(a);
    const bServer = isServerAppendedNotification(b);

    let merged: NotificationModel;
    if (aServer && !bServer) {
        merged = {
            ...a,
            isRead: a.isRead || b.isRead,
            actionPayload: { ...payloadOf(b), ...payloadOf(a) },
        };
    } else if (bServer && !aServer) {
        merged = {
            ...b,
            isRead: a.isRead || b.isRead,
            actionPayload: { ...payloadOf(a), ...payloadOf(b) },
        };
    } else {
        const aTime = parseCreatedAt(a.createdAt);
        const bTime = parseCreatedAt(b.createdAt);
        const newer = bTime >= aTime ? b : a;
        const older = bTime >= aTime ? a : b;

        merged = {
            ...newer,
            title: newer.title || older.title,
            message: newer.message || older.message,
            isRead: a.isRead || b.isRead,
            actionPayload: { ...payloadOf(older), ...payloadOf(newer) },
        };
    }

    return isSameNotificationContent(merged, a) ? a : merged;
}

/** مساواة سطحية بالمرجع لقائمتين مُرتّبتين — صحيحة طالما عناصر القوائم تحافظ على ثبات مرجعي عند غياب التغيير. */
export function notificationListsReferenceEqual(
    x: NotificationModel[],
    y: NotificationModel[],
): boolean {
    if (x === y) return true;
    if (x.length !== y.length) return false;
    return x.every((item, i) => item === y[i]);
}

/**
 * مساواة بالمحتوى لقائمتين مُرتّبتين — لطبقات لا تملك ثبات مرجع بين نداءين
 * (`NotificationRepository.loadLocal` يُعيد `JSON.parse` جديداً كل مرّة، فلا
 * ثبات مرجعي ممكن حتى مع محتوى مطابق حرفياً). `notificationListsReferenceEqual`
 * تُخطئ دائماً هنا؛ هذه تفحص القيم فعلاً — أغلى قليلاً، لكنها الصحيحة عند
 * غياب سلسلة مرجعية بين النداءين.
 */
export function notificationListsContentEqual(
    x: NotificationModel[],
    y: NotificationModel[],
): boolean {
    if (x === y) return true;
    if (x.length !== y.length) return false;
    return x.every((item, i) => isSameNotificationContent(item, y[i]));
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
