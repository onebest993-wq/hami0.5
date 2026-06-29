import {
    extractUserTokenFromRequest,
    getVerifiedTokenSubject,
    isTokenAuthorized,
    assertWifeSignatureRequest,
    wifeUnauthorizedResponse,
} from '../../security/wifeValidator.ts';
import { sanitizePayload } from '../../security/sanitizer.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import {
    markAllNotificationsReadServer,
    markNotificationReadServer,
} from '@/app/services/notifications/notificationServerBlob';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

/**
 * POST /api/notifications/read-state
 * مزامنة isRead من الخادم — isRead أحادي، يقلّل تعارض multi-device.
 */
export async function POST(request: Request): Promise<Response> {
    try {
        const userToken = extractUserTokenFromRequest(request);
        if (!userToken || !(await isTokenAuthorized(userToken))) {
            return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
        }
        const wifeBlock = await assertWifeSignatureRequest(request, userToken);
        if (wifeBlock) return wifeBlock;

        const userId = await getVerifiedTokenSubject(userToken);
        if (!userId) return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });

        const payload = sanitizePayload(await request.json());
        if (!isRecord(payload) || typeof payload.action !== 'string') {
            return wifeJsonResponse(400, { ok: false, error: 'action مطلوب' });
        }

        if (payload.action === 'mark_read') {
            const notificationId =
                typeof payload.notificationId === 'string' ? payload.notificationId.trim() : '';
            if (!notificationId) {
                return wifeJsonResponse(400, { ok: false, error: 'notificationId مطلوب' });
            }
            const notifications = await markNotificationReadServer(userId, notificationId);
            return wifeJsonResponse(200, { ok: true, notifications });
        }

        if (payload.action === 'mark_all_read') {
            const notifications = await markAllNotificationsReadServer(userId);
            return wifeJsonResponse(200, { ok: true, notifications });
        }

        return wifeJsonResponse(400, { ok: false, error: 'إجراء غير معروف' });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Internal read-state error';
        return wifeJsonResponse(500, { ok: false, error: msg });
    }
}
