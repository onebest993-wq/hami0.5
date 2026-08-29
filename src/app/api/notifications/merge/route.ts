import { NOTIFICATIONS_API_INTERNAL_ERROR, requireNotificationsAuth } from '../_auth.ts';
import { sanitizePayload } from '../../security/sanitizer.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { mergeNotificationBlobServer } from '@/app/services/notifications/notificationServerBlob';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import { isActivityLogNotification } from '@/app/infrastructure/NotificationRepository';
import { NOTIFICATION_LIST_CAP } from '@/app/services/notifications/notificationLimits';
import { sanitizeNotificationModelForPersist } from '@/app/services/notifications/notificationInboxSanitize';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

function isNotificationModel(value: unknown): value is NotificationModel {
    if (!isRecord(value)) return false;
    return (
        typeof value.id === 'string' &&
        typeof value.title === 'string' &&
        typeof value.message === 'string' &&
        typeof value.type === 'string' &&
        typeof value.isRead === 'boolean' &&
        typeof value.createdAt === 'string'
    );
}

/**
 * POST /api/notifications/merge
 * دمج قائمة إشعارات في blob من الخادم — بديل آمن لـ kv-proxy set من العميل.
 */
export async function POST(request: Request): Promise<Response> {
    try {
        const auth = await requireNotificationsAuth(request);
        if (auth instanceof Response) return auth;
        const { userId } = auth;

        const payload = sanitizePayload(await request.json());
        if (!isRecord(payload) || !Array.isArray(payload.notifications)) {
            return wifeJsonResponse(400, { ok: false, error: 'notifications[] مطلوب' });
        }

        const incoming = payload.notifications
            .slice(0, NOTIFICATION_LIST_CAP)
            .filter(isNotificationModel)
            .filter((n) => !isActivityLogNotification(n))
            .filter((n) => n.type !== 'system_alert' && n.category !== 'system')
            .map((n) => sanitizeNotificationModelForPersist(n))
            .filter((n): n is NotificationModel => n != null);
        const notifications = await mergeNotificationBlobServer(userId, incoming);

        return wifeJsonResponse(200, { ok: true, notifications });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: NOTIFICATIONS_API_INTERNAL_ERROR });
    }
}
