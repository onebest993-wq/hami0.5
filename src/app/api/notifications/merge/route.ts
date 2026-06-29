import {
    extractUserTokenFromRequest,
    getVerifiedTokenSubject,
    isTokenAuthorized,
    assertWifeSignatureRequest,
    wifeUnauthorizedResponse,
} from '../../security/wifeValidator.ts';
import { sanitizePayload } from '../../security/sanitizer.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { mergeNotificationBlobServer } from '@/app/services/notifications/notificationServerBlob';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import { isActivityLogNotification } from '@/app/infrastructure/NotificationRepository';

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
        const userToken = extractUserTokenFromRequest(request);
        if (!userToken || !(await isTokenAuthorized(userToken))) {
            return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
        }
        const wifeBlock = await assertWifeSignatureRequest(request, userToken);
        if (wifeBlock) return wifeBlock;

        const userId = await getVerifiedTokenSubject(userToken);
        if (!userId) return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });

        const payload = sanitizePayload(await request.json());
        if (!isRecord(payload) || !Array.isArray(payload.notifications)) {
            return wifeJsonResponse(400, { ok: false, error: 'notifications[] مطلوب' });
        }

        const incoming = payload.notifications.filter(isNotificationModel).filter((n) => !isActivityLogNotification(n));
        const notifications = await mergeNotificationBlobServer(userId, incoming);

        return wifeJsonResponse(200, { ok: true, notifications });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Internal merge error';
        return wifeJsonResponse(500, { ok: false, error: msg });
    }
}
