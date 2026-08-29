import type { NotificationModel } from '@/app/infrastructure/notificationModel';

/** سقف موحّد لقائمة الإشعارات (محلي + KV blob). */
export const NOTIFICATION_LIST_CAP = 400;

function isServerAppendedNotification(n: NotificationModel): boolean {
    const payload = n.actionPayload && typeof n.actionPayload === 'object' ? n.actionPayload : {};
    return payload.appendedBy === 'server';
}

/**
 * يُبقي تنبيهات المقر (appendedBy=server) داخل السقف حتى لو كانت في ذيل القائمة.
 * إن زاد عددها عن السقف تُحفظ الأحدث حسب ترتيب القائمة.
 */
export function capNotificationList(list: NotificationModel[]): NotificationModel[] {
    if (list.length <= NOTIFICATION_LIST_CAP) return list;

    const protectedCount = Math.min(
        list.reduce((n, item) => n + (isServerAppendedNotification(item) ? 1 : 0), 0),
        NOTIFICATION_LIST_CAP,
    );
    const otherBudget = NOTIFICATION_LIST_CAP - protectedCount;
    const out: NotificationModel[] = [];
    let protectedTaken = 0;
    let otherTaken = 0;
    for (const item of list) {
        if (isServerAppendedNotification(item)) {
            if (protectedTaken < protectedCount) {
                out.push(item);
                protectedTaken += 1;
            }
        } else if (otherTaken < otherBudget) {
            out.push(item);
            otherTaken += 1;
        }
        if (protectedTaken >= protectedCount && otherTaken >= otherBudget) break;
    }
    return out;
}
