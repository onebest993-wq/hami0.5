import { NOTIFICATIONS_API_INTERNAL_ERROR, requireNotificationsAuth } from '../_auth.ts';
import { sanitizePayload } from '../../security/sanitizer.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { appendIncomingNotificationServer } from '@/app/services/notifications/notificationServerBlob';
import type { NotificationCategory, NotificationType } from '@/app/infrastructure/NotificationRepository';
import {
    clampNotificationInboxText,
    MAX_NOTIFICATION_MESSAGE_LEN,
    MAX_NOTIFICATION_TITLE_LEN,
    sanitizeNotificationDedupeKey,
} from '@/app/services/notifications/notificationInboxSanitize';
import { sanitizeNotificationActionPayload } from '@/app/services/notifications/notificationNavigateSecurity';

const CLIENT_ALLOWED_TYPES = new Set<NotificationType>([
    'new_document',
    'forum_reply',
    'forum_mention',
    'forum_solved',
    'ai_insight',
]);

const CLIENT_ALLOWED_CATEGORIES = new Set<NotificationCategory>(['forum', 'document', 'ai']);

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * POST /api/notifications/append
 * إلحاق إشعار وارد بالـ blob من الخادم (append-only، طابع زمني خادمي).
 */
export async function POST(request: Request): Promise<Response> {
    try {
        const auth = await requireNotificationsAuth(request);
        if (auth instanceof Response) return auth;
        const { userId } = auth;

        const payload = sanitizePayload(await request.json());
        if (!isRecord(payload)) {
            return wifeJsonResponse(400, { ok: false, error: 'payload مطلوب' });
        }

        const title = clampNotificationInboxText(payload.title, MAX_NOTIFICATION_TITLE_LEN);
        const message = clampNotificationInboxText(payload.message, MAX_NOTIFICATION_MESSAGE_LEN);
        if (!title || !message) {
            return wifeJsonResponse(400, { ok: false, error: 'title و message مطلوبان' });
        }

        const type = typeof payload.type === 'string' ? (payload.type as NotificationType) : null;
        if (!type || !CLIENT_ALLOWED_TYPES.has(type)) {
            return wifeJsonResponse(403, { ok: false, error: 'نوع إشعار غير مسموح من العميل' });
        }

        const category = (
            typeof payload.category === 'string' ? payload.category : 'forum'
        ) as NotificationCategory;
        if (!CLIENT_ALLOWED_CATEGORIES.has(category)) {
            return wifeJsonResponse(403, { ok: false, error: 'فئة غير مسموحة من العميل' });
        }

        const dedupeKey = sanitizeNotificationDedupeKey(payload.dedupeKey);
        const actionPayload = isRecord(payload.actionPayload)
            ? sanitizeNotificationActionPayload(payload.actionPayload)
            : undefined;

        const notif = await appendIncomingNotificationServer(userId, {
            title,
            message,
            type,
            category,
            direction: 'incoming',
            dedupeKey,
            actionPayload,
        });

        return wifeJsonResponse(200, { ok: true, notification: notif });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: NOTIFICATIONS_API_INTERNAL_ERROR });
    }
}
