import { requireNotificationsAuth } from '../_auth.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { wipeShellNotificationsServer } from '@/app/services/notifications/notificationServerBlob';

/**
 * POST /api/notifications/wipe
 * مسح inbox الإشعارات (Supabase + KV + legacy prefix) للمستخدم الحالي.
 */
export async function POST(request: Request): Promise<Response> {
    try {
        const auth = await requireNotificationsAuth(request);
        if (auth instanceof Response) return auth;
        const { userId } = auth;

        const ok = await wipeShellNotificationsServer(userId);
        return wifeJsonResponse(200, { ok });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Internal wipe error';
        return wifeJsonResponse(500, { ok: false, error: msg });
    }
}
