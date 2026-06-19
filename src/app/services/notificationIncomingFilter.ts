import {
    deriveNotificationDirection,
    type NotificationModel,
} from '@/app/infrastructure/NotificationRepository';

/** عناوين إجراءات ذاتية (قديمة أو حالية) — ليست إشعارات واردة حقيقية. */
const SELF_ACTION_TITLES = new Set([
    'نشرت سؤالاً في المنتدى',
    'حذفت سؤالاً',
    'رددت على سؤال',
    'حددت أفضل إجابة',
    'تمت إضافة مستند',
    'تم مسح مستند ضوئياً',
    'ربط مستند بقضية',
]);

/** إجراء قام به المحامي بنفسه — لا يُعرض في لوحة الإشعارات. */
export function isSelfActionNotification(n: NotificationModel): boolean {
    const title = String(n.title ?? '').trim();
    if (SELF_ACTION_TITLES.has(title)) return true;
    return deriveNotificationDirection(n) === 'outgoing';
}

/** إشعار وارد حقيقي يستحق عرضاً للمستخدم. */
export function isIncomingNotification(n: NotificationModel): boolean {
    return !isSelfActionNotification(n);
}
