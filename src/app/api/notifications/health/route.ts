import { NOTIFICATIONS_API_INTERNAL_ERROR, requireNotificationsAuth } from '../_auth.ts';
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
        const auth = await requireNotificationsAuth(request);
        if (auth instanceof Response) return auth;

        const storage = getShellNotificationStorageMeta();
        const supabaseEnabled = isShellNotificationSupabaseEnabled();
        const schema = supabaseEnabled ? await verifyShellNotificationSchema() : null;

        const ready =
            !supabaseEnabled || (schema?.ok === true && schema.inbox && schema.events && schema.inboxView);

        return wifeJsonResponse(200, {
            ok: true,
            ready,
            supabaseEnabled,
            storage,
            schema,
        });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: NOTIFICATIONS_API_INTERNAL_ERROR });
    }
}
