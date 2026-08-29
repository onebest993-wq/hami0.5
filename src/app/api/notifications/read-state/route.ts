import { NOTIFICATIONS_API_INTERNAL_ERROR, requireNotificationsAuth } from '../_auth.ts';
import { sanitizePayload } from '../../security/sanitizer.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import {
    markAllNotificationsReadServer,
    markNotificationReadServer,
} from '@/app/services/notifications/notificationServerBlob';
import { sanitizeNotificationEntityId } from '@/app/services/notifications/notificationNavigateSecurity';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

/**
 * POST /api/notifications/read-state
 * مزامنة isRead من الخادم — isRead أحادي، يقلّل تعارض multi-device.
 */
export async function POST(request: Request): Promise<Response> {
    try {
        const auth = await requireNotificationsAuth(request);
        if (auth instanceof Response) return auth;
        const { userId } = auth;

        const payload = sanitizePayload(await request.json());
        if (!isRecord(payload) || typeof payload.action !== 'string') {
            return wifeJsonResponse(400, { ok: false, error: 'action مطلوب' });
        }

        if (payload.action === 'mark_read') {
            const notificationId = sanitizeNotificationEntityId(payload.notificationId);
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
    } catch {
        return wifeJsonResponse(500, { ok: false, error: NOTIFICATIONS_API_INTERNAL_ERROR });
    }
}
