import { requireTrustedHeadquartersAdmin } from '../../security/requireTrustedHeadquartersAdmin.ts';
import { getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import { wifeJsonNoStore, wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { consumeRateLimitSlot } from '../../security/wifeRateLimitStore.ts';
import { listHeadquartersCourtStatsCached } from '../../security/headquartersCourtStats.ts';

export const runtime = 'nodejs';

function wantsFreshStats(request: Request): boolean {
    try {
        return new URL(request.url).searchParams.get('fresh') === '1';
    } catch {
        return false;
    }
}

export async function GET(request: Request): Promise<Response> {
    try {
        const gate = await requireTrustedHeadquartersAdmin(request);
        if (!gate.ok) return gate.response;

        const allowed = await consumeRateLimitSlot(`admin-hq-stats:${gate.userId}`, {
            maxRequests: 20,
            windowMs: 60_000,
        });
        if (!allowed) {
            return wifeJsonNoStore(429, { ok: false, error: 'تجاوزت حد عمليات المقر — حاول لاحقاً' });
        }

        const admin = getSupabaseAdminClient();
        if (!admin) {
            return wifeJsonNoStore(503, { ok: false, error: 'Database client not configured' });
        }

        const courts = await listHeadquartersCourtStatsCached(admin, { fresh: wantsFreshStats(request) });
        return wifeJsonNoStore(200, {
            ok: true,
            courts,
        });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'Internal admin stats error' });
    }
}
