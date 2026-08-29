/**
 * ثوابت أحداث نقر إشعار نظام التشغيل — خفيفة للوحة/الجسور بدون سحب منطق التوجيه.
 */
export const HAMI_NATIVE_NOTIFICATION_RECEIVED_EVENT = 'hami:native-notification-received';

/** فتح لوحة الإشعارات (بدون تنقّل ميزة) بعد نقر إشعار نظام */
export const HAMI_OS_NOTIFICATION_OPEN_PANEL_EVENT = 'hami:os-notification-open-panel';

export const HAMI_OS_NOTIFICATION_OPEN_MESSAGE = 'HAMI_NOTIFICATION_OPEN' as const;
export const HAMI_OS_NOTIFY_QUERY = 'hamiOsNotify';
export const HAMI_OS_NOTIFY_PENDING_KEY = 'hami:os-notify-pending:v1';
