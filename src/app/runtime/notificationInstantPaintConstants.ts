export const NOTIFICATION_LAYER_SELECTOR = '[data-notification-root]';
export const NOTIFICATION_OPEN_ATTR = 'data-hami-notifications-open';
export const NOTIFICATION_INTERACT_CLASS = 'hami-notif-layer--interact';
export const NOTIFICATION_BRIDGE_ID = 'hami-notifications-instant-bridge';
/** قشرة الطلاء الفوري — نفس نصف قطر/خلفية/عنوان الورقة الحيّة */
export const NOTIFICATION_INSTANT_SHEET_RADIUS = '0.75rem 0.75rem 0 0';
export const NOTIFICATION_INSTANT_SHEET_BG = '#0b1021';
export const NOTIFICATION_INSTANT_TITLE_SIZE = '1.0625rem';
export const NOTIFICATION_INSTANT_TITLE_WEIGHT = '600';
/** قفل الخلفية/الإغلاق ريثما تكتمل لمسة الجرس */
export const NOTIFICATION_DISMISS_LOCK_ATTR = 'data-hami-notif-dismiss-locked';
/** احتياط لإصبع معلّق بلا pointerup — ليست مهلة تسليح الإغلاق */
export const NOTIFICATION_DISMISS_UNLOCK_FALLBACK_MS = 700;
