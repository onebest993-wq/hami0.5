import SecureStoreService from '@/app/services/SecureStoreService';
import { capNotificationList } from '@/app/services/notifications/notificationLimits';
import {
    capMergedNotificationLists,
    mergeNotificationRecord,
} from '@/app/services/notifications/notificationMerge';
import { appendNotificationClient } from '@/app/services/notifications/notificationClientAppend';
import {
    mergeNotificationsClient,
    syncMarkAllReadClient,
    syncMarkReadClient,
    fetchNotificationsClient,
} from '@/app/services/notifications/notificationClientPersist';
import { isNotificationServerSyncEnabled } from '@/app/services/notifications/notificationServerSync';

/**
 * أنواع الإشعارات (events). كل واحدة تُشير إلى حدث ماضٍ يستحق علم المستخدم.
 *
 * - forum_*: أحداث المنتدى (رد، إشارة، إجابة محلولة)
 * - ai_insight, new_document: أنواع قديمة (للتوافق الخلفي)
 * - system_alert: إشعارات النظام
 * - audit_log_* / deadline: legacy — تُصفّى عند العرض (isActivityLogNotification)
 */
export type NotificationType =
    | 'deadline' // legacy
    | 'system_alert'
    | 'ai_insight'
    | 'new_document'
    | 'audit_log_civil'
    | 'audit_log_criminal'
    | 'audit_log_execution'
    | 'audit_log_task'
    | 'forum_reply'
    | 'forum_mention'
    | 'forum_solved';

/**
 * الفئة الدلالية للإشعار — يُستخدم لفلاتر "سجل النشاطات".
 * مستقل عن `type` ليسمح بنشاطات متعددة الأنواع ضمن نفس الفئة.
 */
export type NotificationCategory =
    | 'civil'
    | 'criminal'
    | 'execution'
    | 'task'
    | 'forum'
    | 'system'
    | 'document'
    | 'ai';

/**
 * اتجاه الحدث — مفهوم "سجل الوارد/الصادر" مثل سجل البريد الإداري:
 *  - 'outgoing': أفعال **يقوم بها المحامي** (إنشاء قضية، تسجيل دفعة، إرسال تبليغ، إضافة مستند، ...)
 *  - 'incoming': أحداث **تَرِد إلى المحامي** من الخارج (رد منتدى، mention، طلب موكل، إعلان نظام، ...)
 */
export type NotificationDirection = 'incoming' | 'outgoing';

export interface NotificationModel {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    /** الفئة الدلالية — مُتاحة كحقل اختياري للتوافق الخلفي (تُشتق من type عند غيابها). */
    category?: NotificationCategory;
    /** اتجاه الحدث (وارد/صادر). تُشتق من type عند غيابها. */
    direction?: NotificationDirection;
    isRead: boolean;
    actionPayload?: Record<string, unknown>;
    createdAt: string;
}

/**
 * اشتقاق اتجاه الإشعار (وارد/صادر) من نوعه إن لم يُعطَ صراحةً.
 *
 * القاعدة العامة:
 *   - audit_log_*: صادر (المحامي قام بها)
 *   - forum_reply/mention: وارد (وصل للمحامي)
 *   - forum_solved: وارد (شخص ما حدّد إجابته كمحلولة)
 *   - new_document: غامض — حسب payload (إن وصل من موكل → وارد، إن مسحه المحامي → صادر)
 *   - ai_insight, system_alert: وارد
 *   - deadline (legacy): وارد (تنبيه نظام)
 */
export function deriveNotificationDirection(n: NotificationModel): NotificationDirection {
    if (n.direction) return n.direction;
    switch (n.type) {
        case 'audit_log_civil':
        case 'audit_log_criminal':
        case 'audit_log_execution':
        case 'audit_log_task':
            return 'outgoing';
        case 'forum_reply':
        case 'forum_mention':
        case 'forum_solved':
        case 'ai_insight':
        case 'system_alert':
        case 'deadline':
            return 'incoming';
        case 'new_document':
            // إن كان payload يحوي source=client → وارد، else → صادر
            if (n.actionPayload && typeof n.actionPayload === 'object') {
                const p = n.actionPayload as Record<string, unknown>;
                if (p.source === 'client' || p.source === 'incoming') return 'incoming';
            }
            return 'outgoing';
        default:
            return 'incoming';
    }
}

/** اشتقاق فئة الإشعار من نوعه إن لم تكن مُعطاة صراحةً (backward-compat). */
export function deriveNotificationCategory(n: NotificationModel): NotificationCategory {
    if (n.category) return n.category;
    switch (n.type) {
        case 'audit_log_civil':
            return 'civil';
        case 'audit_log_criminal':
            return 'criminal';
        case 'audit_log_execution':
            return 'execution';
        case 'audit_log_task':
            return 'task';
        case 'forum_reply':
        case 'forum_mention':
        case 'forum_solved':
            return 'forum';
        case 'system_alert':
            return 'system';
        case 'new_document':
            return 'document';
        case 'ai_insight':
            return 'ai';
        case 'deadline':
            // legacy: حاول تخمين الفئة من actionPayload (caseId/executionId)
            if (n.actionPayload && typeof n.actionPayload === 'object') {
                const p = n.actionPayload as Record<string, unknown>;
                if (p.executionId) return 'execution';
                if (p.criminalId) return 'criminal';
                if (p.caseId) return 'civil';
            }
            return 'task';
        default:
            return 'system';
    }
}

const ACTIVITY_AUDIT_TYPES = new Set<NotificationType>([
    'audit_log_civil',
    'audit_log_criminal',
    'audit_log_execution',
    'audit_log_task',
    'deadline',
]);

/** إشعار «سجل النشاطات» — مُعطّل في المنتج (لا يُعرض ولا يُخزَّن). */
export function isActivityLogNotification(n: Pick<NotificationModel, 'type' | 'category'>): boolean {
    if (ACTIVITY_AUDIT_TYPES.has(n.type)) return true;
    const cat = n.category ?? deriveNotificationCategory(n as NotificationModel);
    return cat === 'civil' || cat === 'criminal' || cat === 'execution' || cat === 'task';
}

export function isActivityAuditNotificationType(type: NotificationType): boolean {
    return ACTIVITY_AUDIT_TYPES.has(type);
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

/** قراءة sync من التخزين المحلي — عرض فوري قبل اكتمال الجلب الشبكي */
export function peekLocalNotifications(userId: string): NotificationModel[] {
    return loadLocal(userId);
}

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
    saveLocal(userId, capped);

    if (!isNotificationServerSyncEnabled() || options?.skipRemote) return capped;

    const serverMerged = await mergeNotificationsClient(capped);
    if (serverMerged) {
        saveLocal(userId, serverMerged);
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
        const local = loadLocal(userId);
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
        const local = loadLocal(userId);
        if (!isNotificationServerSyncEnabled()) {
            return local;
        }

        try {
            const remote = await fetchRemoteKv(userId);
            const merged = capMergedNotificationLists(remote, local);
            saveLocal(userId, merged);
            return merged;
        } catch {
            return local;
        }
    },

    markAsRead: async (userId: string, notificationId: string, currentList: NotificationModel[]) => {
        const serverList = await syncMarkReadClient(notificationId);
        if (serverList) {
            const local = loadLocal(userId);
            const merged = capMergedNotificationLists(local, serverList, currentList);
            saveLocal(userId, merged);
            return true;
        }

        const local = loadLocal(userId);
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
            const local = loadLocal(userId);
            const merged = capMergedNotificationLists(local, serverList, currentList);
            saveLocal(userId, merged);
            return true;
        }

        const local = loadLocal(userId);
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
        const local = loadLocal(userId);
        const remote = await fetchRemoteKv(userId);
        const merged = capMergedNotificationLists(local, remote, list);

        const serverMerged = await mergeNotificationsClient(merged);
        if (serverMerged) {
            saveLocal(userId, serverMerged);
            return serverMerged;
        }

        return persistMergedList(userId, merged);
    },
};
