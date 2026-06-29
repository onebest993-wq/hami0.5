import {
    extractUserTokenFromRequest,
    getVerifiedTokenSubject,
    isTokenAuthorized,
    assertWifeSignatureRequest,
    wifeUnauthorizedResponse,
} from '../../security/wifeValidator.ts';
import { sanitizePayload } from '../../security/sanitizer.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { appendIncomingNotificationServer } from '@/app/services/notifications/notificationServerBlob';
import type { NotificationCategory, NotificationType } from '@/app/infrastructure/NotificationRepository';

const ALLOWED_TYPES = new Set<NotificationType>([
    'system_alert',
    'new_document',
    'forum_reply',
    'forum_mention',
    'forum_solved',
    'ai_insight',
]);

const ALLOWED_CATEGORIES = new Set<NotificationCategory>([
    'forum',
    'system',
    'document',
    'ai',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

/**
 * POST /api/notifications/append
 * إلحاق إشعار وارد بالـ blob من الخادم (append-only، طابع زمني خادمي).
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
        if (!isRecord(payload)) {
            return wifeJsonResponse(400, { ok: false, error: 'payload مطلوب' });
        }

        const title = typeof payload.title === 'string' ? payload.title.trim() : '';
        const message = typeof payload.message === 'string' ? payload.message.trim() : '';
        if (!title || !message) {
            return wifeJsonResponse(400, { ok: false, error: 'title و message مطلوبان' });
        }

        const type = (typeof payload.type === 'string' ? payload.type : 'system_alert') as NotificationType;
        if (!ALLOWED_TYPES.has(type)) {
            return wifeJsonResponse(400, { ok: false, error: 'نوع إشعار غير مسموح' });
        }

        const category = (
            typeof payload.category === 'string' ? payload.category : 'system'
        ) as NotificationCategory;
        if (!ALLOWED_CATEGORIES.has(category)) {
            return wifeJsonResponse(400, { ok: false, error: 'فئة غير مسموحة' });
        }

        const dedupeKey = typeof payload.dedupeKey === 'string' ? payload.dedupeKey.trim() : undefined;
        const actionPayload =
            isRecord(payload.actionPayload) ? (payload.actionPayload as Record<string, unknown>) : undefined;

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
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Internal append error';
        return wifeJsonResponse(500, { ok: false, error: msg });
    }
}
