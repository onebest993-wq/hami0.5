import { isNotificationServerSyncEnabled } from '@/app/services/notifications/notificationServerSync';

/** مسح inbox الإشعارات على الخادم — best effort أثناء application wipe. */
export async function wipeShellNotificationsClient(): Promise<boolean> {
    if (!isNotificationServerSyncEnabled()) return false;

    try {
        const { SecureAPIClient } = await import('@/app/services/SecureAPIClient');
        const res = await SecureAPIClient.fetchSecure<{ ok?: boolean }>('/api/notifications/wipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });
        return res?.ok === true;
    } catch {
        return false;
    }
}
