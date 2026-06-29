import {
    extractUserTokenFromRequest,
    getVerifiedTokenSubject,
    isTokenAuthorized,
    assertWifeSignatureRequest,
    wifeUnauthorizedResponse,
} from '../../security/wifeValidator.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { listNotificationsServer, getShellNotificationStorageMeta } from '@/app/services/notifications/notificationServerBlob';

/**
 * GET /api/notifications/list
 * inbox موحّد من الخادم (Supabase → KV fallback).
 */
export async function GET(request: Request): Promise<Response> {
    try {
        const userToken = extractUserTokenFromRequest(request);
        if (!userToken || !(await isTokenAuthorized(userToken))) {
            return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
        }
        const wifeBlock = await assertWifeSignatureRequest(request, userToken);
        if (wifeBlock) return wifeBlock;

        const userId = await getVerifiedTokenSubject(userToken);
        if (!userId) return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });

        const notifications = await listNotificationsServer(userId);
        const unreadCount = notifications.filter((n) => !n.isRead).length;
        const storage = getShellNotificationStorageMeta();

        return wifeJsonResponse(200, { ok: true, notifications, unreadCount, storage });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Internal list error';
        return wifeJsonResponse(500, { ok: false, error: msg });
    }
}
