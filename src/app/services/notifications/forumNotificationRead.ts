import { SecureAPIClient, SecureFetchError } from '@/app/services/SecureAPIClient';

type ApiOk<T> = { ok: true } & T;
type ApiErr = { ok: false; error?: string };

async function postForumJson<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const res = await SecureAPIClient.fetchSecure<T & ApiErr>(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (res && typeof res === 'object' && (res as ApiErr).ok === false) {
        const message = (res as ApiErr).error?.trim() || 'تعذّر تنفيذ العملية';
        throw new SecureFetchError(message, 400, JSON.stringify(res), endpoint);
    }
    return res as T;
}

/** قراءة/كتابة حالة القراءة في NotificationDB + API — بدون لمس notificationStore. */
export async function persistForumNotificationRead(
    userId: string,
    notificationId: string,
): Promise<void> {
    const { NotificationDB } = await import('@/app/services/lawyer-cloud');
    await NotificationDB.markAsRead(notificationId, userId);
    try {
        await postForumJson<ApiOk<Record<string, never>>>('/api/forum/notifications', {
            action: 'mark_read',
            notificationId,
        });
    } catch {
        /* local ok */
    }
}

export async function persistForumMarkAllRead(userId: string): Promise<void> {
    const { NotificationDB } = await import('@/app/services/lawyer-cloud');
    await NotificationDB.markAllAsRead(userId);
    try {
        await postForumJson<ApiOk<Record<string, never>>>('/api/forum/notifications', {
            action: 'mark_all_read',
        });
    } catch {
        /* local ok */
    }
}

export async function countForumUnread(userId: string): Promise<number> {
    const { NotificationDB } = await import('@/app/services/lawyer-cloud');
    const rows = await NotificationDB.getNotifications(userId);
    return rows.filter((n) => !n.read).length;
}
