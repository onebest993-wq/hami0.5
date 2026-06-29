import {
    extractUserTokenFromRequest,
    getVerifiedTokenSubject,
    isTokenAuthorized,
    assertWifeSignatureRequest,
    wifeUnauthorizedResponse,
} from '../../security/wifeValidator.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { wipeShellNotificationsServer } from '@/app/services/notifications/notificationServerBlob';

/**
 * POST /api/notifications/wipe
 * مسح inbox الإشعارات (Supabase + KV + legacy prefix) للمستخدم الحالي.
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

        const ok = await wipeShellNotificationsServer(userId);
        return wifeJsonResponse(200, { ok });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Internal wipe error';
        return wifeJsonResponse(500, { ok: false, error: msg });
    }
}
