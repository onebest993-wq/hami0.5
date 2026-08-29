import { NOTIFICATIONS_API_INTERNAL_ERROR, requireNotificationsAuth } from '../_auth.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { listNotificationsServer, getShellNotificationStorageMeta } from '@/app/services/notifications/notificationServerBlob';

/**
 * GET /api/notifications/list
 * inbox موحّد من الخادم (Supabase → KV fallback).
 */
export async function GET(request: Request): Promise<Response> {
    try {
        const auth = await requireNotificationsAuth(request);
        if (auth instanceof Response) return auth;
        const { userId } = auth;

        const notifications = await listNotificationsServer(userId);
        const unreadCount = notifications.filter((n) => !n.isRead).length;
        const storage = getShellNotificationStorageMeta();

        return wifeJsonResponse(200, { ok: true, notifications, unreadCount, storage });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: NOTIFICATIONS_API_INTERNAL_ERROR });
    }
}
