import { jsonResponse } from '../_auth.ts';
import { requireTrustedHeadquartersAdmin } from '../../security/requireTrustedHeadquartersAdmin.ts';
import { consumeRateLimitSlot } from '../../security/wifeRateLimitStore.ts';
import { loadForumOfficialStats } from '../../../services/forum/forumOfficialStats.ts';

/** إحصاءات منتدى المقر — جلسة WIFE + مدير + جهاز موثّق OTP. */

export async function GET(request: Request): Promise<Response> {
    try {
        const gate = await requireTrustedHeadquartersAdmin(request);
        if (!gate.ok) return gate.response;

        const allowed = await consumeRateLimitSlot(`admin-hq-forum-stats:${gate.userId}`, {
            maxRequests: 40,
            windowMs: 60_000,
        });
        if (!allowed) {
            return jsonResponse(429, { ok: false, error: 'تجاوزت حد عمليات المقر — حاول لاحقاً' });
        }

        const stats = await loadForumOfficialStats();
        if (!stats) {
            return jsonResponse(503, { ok: false, error: 'Database client not configured' });
        }
        return jsonResponse(200, { ok: true, stats });
    } catch {
        return jsonResponse(500, { ok: false, error: 'Internal server error' });
    }
}
