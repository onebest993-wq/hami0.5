import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { SecureAPIClient, getCurrentAccessToken } from '@/app/services/SecureAPIClient';
import SecureStoreService from '@/app/services/SecureStoreService';

/**
 * بناء headers المصادقة لطلبات kv-proxy.
 * يستخدم JWT المستخدم الحالي (وليس anon key) لتجاوز فحص ownership على الـ Edge.
 */
async function buildKvAuthHeaders(): Promise<Record<string, string>> {
    const token = await getCurrentAccessToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token ?? publicAnonKey}`,
        'apikey': publicAnonKey,
    };
}

// --- TYPES ---
/**
 * أنواع الإشعارات (events). كل واحدة تُشير إلى حدث ماضٍ يستحق علم المستخدم.
 *
 * - audit_log_*: نشاطات داخل أقسام التطبيق (إضافة قضية، تحديث مرحلة، إكمال إجراء)
 * - forum_*: أحداث المنتدى (رد، إشارة، إجابة محلولة)
 * - ai_insight, new_document: ذكاء + مستندات (للتوافق الخلفي)
 * - system_alert: إشعارات النظام
 * - deadline (legacy): محتفظ بها للتوافق مع التنبيهات القديمة (لكن المنتجات الجديدة تستخدم audit_log_*)
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

/**
 * يحفظ إشعاراً جديداً محلياً (و يُحاول مزامنته مع الخادم في prod).
 * يُستخدم من `notificationStore.addNotification` لضمان عدم ضياع الإشعار عند الـ fetch التالي.
 */
async function persistAddedNotification(userId: string, notif: NotificationModel): Promise<void> {
    try {
        const existing = loadLocal(userId);
        // dedupe على الـ id حتى لو نُشر مرّتين بسرعة
        const exists = existing.some((n) => n.id === notif.id);
        const next = exists ? existing : [notif, ...existing];
        const capped = next.length > 400 ? next.slice(0, 400) : next;
        saveLocal(userId, capped);

        if (import.meta.env.DEV) return; // dev: محلياً فقط
        // prod: مزامنة مع KV proxy (محاولة non-blocking)
        try {
            const headers = await buildKvAuthHeaders();
            await SecureAPIClient.fetchSecure(
                `https://${projectId}.supabase.co/functions/v1/make-server-f09713ba/kv-proxy`,
                {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        action: 'set',
                        key: `notifications_${userId}`,
                        value: capped,
                    }),
                },
                '127.0.0.1',
            );
        } catch { /* shrug — local already saved */ }
    } catch { /* ignore */ }
}

export const NotificationRepository = {

    /** يُستخدم من notificationStore.addNotification */
    addNotification: persistAddedNotification,

    fetchNotifications: async (userId: string): Promise<NotificationModel[]> => {
        if (import.meta.env.DEV) {
            return loadLocal(userId);
        }
        try {
            const headers = await buildKvAuthHeaders();
            const data = await SecureAPIClient.fetchSecure(
                `https://${projectId}.supabase.co/functions/v1/make-server-f09713ba/kv-proxy`,
                {
                    method: 'POST',
                    headers,
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
            const headers = await buildKvAuthHeaders();
            await SecureAPIClient.fetchSecure(
                `https://${projectId}.supabase.co/functions/v1/make-server-f09713ba/kv-proxy`,
                {
                    method: 'POST',
                    headers,
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
            const headers = await buildKvAuthHeaders();
            await SecureAPIClient.fetchSecure(
                `https://${projectId}.supabase.co/functions/v1/make-server-f09713ba/kv-proxy`,
                {
                    method: 'POST',
                    headers,
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
