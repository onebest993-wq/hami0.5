import { NOTIFICATIONS_API_INTERNAL_ERROR, requireNotificationsAuth } from '../_auth.ts';
import { sanitizePayload } from '../../security/sanitizer.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { saveFcmTokenServer } from '@/app/services/notifications/fcm/fcmTokenStore.server';
import { isAllowedFcmToken } from '@/app/services/notifications/notificationInboxSanitize';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

/**
 * POST /api/notifications/fcm-register
 * تسجيل رمز FCM للجهاز — Android/iOS عبر Capacitor Push.
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

        const token = typeof payload.token === 'string' ? payload.token.trim() : '';
        if (!isAllowedFcmToken(token)) {
            return wifeJsonResponse(400, { ok: false, error: 'token غير صالح' });
        }

        const platformRaw = typeof payload.platform === 'string' ? payload.platform.trim() : 'android';
        const platform = platformRaw === 'ios' ? 'ios' : 'android';

        await saveFcmTokenServer(userId, token, platform);
        return wifeJsonResponse(200, { ok: true });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: NOTIFICATIONS_API_INTERNAL_ERROR });
    }
}
