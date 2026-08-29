import SecureStoreService from '@/app/services/SecureStoreService';
import { capNotificationList } from '@/app/services/notifications/notificationLimits';
import {
    capMergedNotificationLists,
    mergeNotificationRecord,
    notificationListsContentEqual,
} from '@/app/services/notifications/notificationMerge';
import { appendNotificationClient } from '@/app/services/notifications/notificationClientAppend';
import {
    mergeNotificationsClient,
    syncMarkAllReadClient,
    syncMarkReadClient,
    fetchNotificationsClient,
} from '@/app/services/notifications/notificationClientPersist';
import { isNotificationServerSyncEnabled } from '@/app/services/notifications/notificationServerSync';
import type { NotificationModel } from '@/app/infrastructure/notificationModel';
import {
    clearLegacyPlaintextMirror,
    readSecureOrDrainLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';

export type {
    NotificationType,
    NotificationCategory,
    NotificationDirection,
    NotificationModel,
} from '@/app/infrastructure/notificationModel';

export {
    deriveNotificationDirection,
    deriveNotificationCategory,
    isActivityLogNotification,
    isActivityAuditNotificationType,
} from '@/app/infrastructure/notificationModel';

const LOCAL_KEY_PREFIX = 'hami:notifications:v1:';

function getLocalKey(userId: string): string {
    return `${LOCAL_KEY_PREFIX}${userId}`;
}

/*
 * leftover يُرحَّل هنا لا في peek أول الطلاء. ثم getItem يفكّ المفتاح إن بقي بارداً.
 */
async function loadLocal(userId: string): Promise<NotificationModel[]> {
    try {
        const key = getLocalKey(userId);
        const drained = readSecureOrDrainLegacySync(key);
        const raw = drained ?? (await SecureStoreService.getItem(key));
        if (raw) {
            const parsed: unknown = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed as NotificationModel[];
        }
    } catch { /* ignore */ }
    return [];
}

async function saveLocal(userId: string, list: NotificationModel[]): Promise<void> {
    try {
        await SecureStoreService.setItem(getLocalKey(userId), JSON.stringify(list));
        clearLegacyPlaintextMirror(getLocalKey(userId));
    } catch { /* ignore */ }
}

/** قراءة sync من التخزين المحلي — عرض فوري قبل اكتمال الجلب الشبكي */
export { peekLocalNotifications } from '@/app/infrastructure/notificationPeekLite';

async function fetchRemoteKv(_userId: string): Promise<NotificationModel[]> {
    if (!isNotificationServerSyncEnabled()) return [];
    const fromApi = await fetchNotificationsClient();
    return fromApi ?? [];
}

async function persistMergedList(
    userId: string,
    list: NotificationModel[],
    options?: { skipRemote?: boolean },
): Promise<NotificationModel[]> {
    const capped = capNotificationList(list);
    await saveLocal(userId, capped);

    if (!isNotificationServerSyncEnabled() || options?.skipRemote) return capped;

    const serverMerged = await mergeNotificationsClient(capped);
    if (serverMerged) {
        await saveLocal(userId, serverMerged);
        return serverMerged;
    }

    return capped;
}

/**
 * يحفظ إشعاراً — في الإنتاج: append خادمي أولاً، ثم دمج محلي (الخادم مصدر موثوق).
 */
async function persistAddedNotification(
    userId: string,
    notif: NotificationModel,
): Promise<NotificationModel | null> {
    try {
        const dedupeKey =
            notif.actionPayload && typeof notif.actionPayload === 'object'
                ? String((notif.actionPayload as Record<string, unknown>).dedupeKey ?? '').trim() ||
                  undefined
                : undefined;

        const serverNotif = await appendNotificationClient({
            title: notif.title,
            message: notif.message,
            type: notif.type,
            category: notif.category,
            dedupeKey,
            actionPayload: notif.actionPayload,
        });

        const authoritative = serverNotif ?? notif;
        const local = await loadLocal(userId);
        const remote = serverNotif ? [] : await fetchRemoteKv(userId);
        const merged = capMergedNotificationLists(local, remote);
        const existing = merged.find(
            (n) =>
                n.id === authoritative.id ||
                (dedupeKey &&
                    (n.actionPayload as Record<string, unknown> | undefined)?.dedupeKey === dedupeKey),
        );
        const next = existing
            ? merged.map((n) =>
                  n.id === existing.id ? mergeNotificationRecord(n, authoritative) : n,
              )
            : capNotificationList([authoritative, ...merged]);

        await persistMergedList(userId, next, { skipRemote: Boolean(serverNotif) });
        return authoritative;
    } catch {
        return null;
    }
}

export const NotificationRepository = {

    /** يُستخدم من notificationStore.addNotification */
    addNotification: persistAddedNotification,

    fetchNotifications: async (userId: string): Promise<NotificationModel[]> => {
        const local = await loadLocal(userId);
        if (!isNotificationServerSyncEnabled()) {
            return local;
        }

        try {
            const remote = await fetchRemoteKv(userId);
            const merged = capMergedNotificationLists(remote, local);
            /*
             * المفتاح مشفَّر الآن — كتابة غير مشروطة على كل poll (٣٠–٦٠ث) تعني
             * تشفيراً جديداً حتى حين لا يصل شيء جديد، وهي الحالة الغالبة.
             * `local` هنا JSON.parse جديد كل نداء (لا ثبات مرجعي ممكن)، فالمقارنة
             * بالمحتوى — لا بالمرجع — هي الصحيحة لتخطّي الكتابة عند غياب تغيّر فعلي.
             */
            if (!notificationListsContentEqual(merged, local)) {
                await saveLocal(userId, merged);
            }
            return merged;
        } catch {
            return local;
        }
    },

    markAsRead: async (userId: string, notificationId: string, currentList: NotificationModel[]) => {
        const serverList = await syncMarkReadClient(notificationId);
        if (serverList) {
            const local = await loadLocal(userId);
            const merged = capMergedNotificationLists(local, serverList, currentList);
            await saveLocal(userId, merged);
            return true;
        }

        const local = await loadLocal(userId);
        const remote = await fetchRemoteKv(userId);
        const base = capMergedNotificationLists(local, remote, currentList);
        const updatedList = base.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n,
        );

        await persistMergedList(userId, updatedList);
        return true;
    },

    markAllAsRead: async (userId: string, currentList: NotificationModel[]) => {
        const serverList = await syncMarkAllReadClient();
        if (serverList) {
            const local = await loadLocal(userId);
            const merged = capMergedNotificationLists(local, serverList, currentList);
            await saveLocal(userId, merged);
            return true;
        }

        const local = await loadLocal(userId);
        const remote = await fetchRemoteKv(userId);
        const base = capMergedNotificationLists(local, remote, currentList);
        const updatedList = base.map((n) => ({ ...n, isRead: true }));

        await persistMergedList(userId, updatedList);
        return true;
    },

    /** استبدال القائمة كاملة — للـ migration/purge (كتابة حاسمة). */
    replaceAllNotifications: async (userId: string, list: NotificationModel[]) => {
        return persistMergedList(userId, list);
    },

    /** حفظ مع دمج المحلي/البعيد — للمزامنة اليومية (isRead أحادي). */
    saveNotifications: async (userId: string, list: NotificationModel[]) => {
        const local = await loadLocal(userId);
        const remote = await fetchRemoteKv(userId);
        const merged = capMergedNotificationLists(local, remote, list);

        const serverMerged = await mergeNotificationsClient(merged);
        if (serverMerged) {
            await saveLocal(userId, serverMerged);
            return serverMerged;
        }

        return persistMergedList(userId, merged);
    },
};
