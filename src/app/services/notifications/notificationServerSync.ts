/**
 * متى يُستخدم مسار الخادم (append / read-state / merge / list).
 * المتصفح يسحب صندوق الخادم افتراضياً — إشعار المقر يُكتب على الخادم فقط.
 * عطّله صراحةً: VITE_HAMI_NOTIFICATION_SERVER_SYNC=false
 */
export function resolveNotificationServerSyncEnabled(input: {
    isBrowser: boolean;
    flag?: string | undefined;
}): boolean {
    if (!input.isBrowser) return true;
    const flag = String(input.flag ?? '').trim().toLowerCase();
    return flag !== 'false' && flag !== '0';
}

export function isNotificationServerSyncEnabled(): boolean {
    return resolveNotificationServerSyncEnabled({
        isBrowser: typeof window !== 'undefined',
        flag: import.meta.env.VITE_HAMI_NOTIFICATION_SERVER_SYNC,
    });
}
