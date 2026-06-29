/**
 * متى يُستخدم مسار الخادم (append / read-state / merge) بدلاً من kv-proxy من العميل.
 * DEV: محلي افتراضياً — فعّل VITE_HAMI_NOTIFICATION_SERVER_SYNC=true لمطابقة الإنتاج.
 */
export function isNotificationServerSyncEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    if (import.meta.env.VITE_HAMI_NOTIFICATION_SERVER_SYNC === 'true') return true;
    return !import.meta.env.DEV;
}
