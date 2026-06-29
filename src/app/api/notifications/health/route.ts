import {
    extractUserTokenFromRequest,
    getVerifiedTokenSubject,
    isTokenAuthorized,
    assertWifeSignatureRequest,
    wifeUnauthorizedResponse,
} from '../../security/wifeValidator.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { getShellNotificationStorageMeta } from '@/app/services/notifications/notificationServerBlob';
import {
    isShellNotificationSupabaseEnabled,
    verifyShellNotificationSchema,
} from '@/app/services/notifications/notificationSupabaseInbox';

/**
 * GET /api/notifications/health
 * حالة التخزين + تحقق schema (بعد push migrations 027/028).
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

        const storage = getShellNotificationStorageMeta();
        const supabaseEnabled = isShellNotificationSupabaseEnabled();
        const schema = supabaseEnabled ? await verifyShellNotificationSchema() : null;

        const ready =
            !supabaseEnabled || (schema?.ok === true && schema.inbox && schema.events && schema.inboxView);

        return wifeJsonResponse(200, {
            ok: true,
            ready,
            userId,
            supabaseEnabled,
            storage,
            schema,
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Internal health error';
        return wifeJsonResponse(500, { ok: false, error: msg });
    }
}
