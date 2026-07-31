/**
 * نموذج الإشعار الخفيف — أنواع + اشتقاقات نقية بلا SecureAPIClient / تخزين.
 * يبقي مسار الرئيسية (forum bridge) بعيداً عن secure-api-client.
 */

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
