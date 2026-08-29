import { requireTrustedHeadquartersAdmin } from '../../security/requireTrustedHeadquartersAdmin.ts';
import { getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { consumeRateLimitSlot } from '../../security/wifeRateLimitStore.ts';
import { listHeadquartersAudit } from '../../security/headquartersAuditQuery.ts';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
    try {
        const gate = await requireTrustedHeadquartersAdmin(request);
        if (!gate.ok) return gate.response;

        const allowed = await consumeRateLimitSlot(`admin-hq-audit:${gate.userId}`, {
            maxRequests: 40,
            windowMs: 60_000,
        });
        if (!allowed) {
            return wifeJsonResponse(429, { ok: false, error: 'تجاوزت حد عمليات المقر — حاول لاحقاً' });
        }

        const admin = getSupabaseAdminClient();
        if (!admin) {
            return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
        }

        const entries = await listHeadquartersAudit(admin);
        return wifeJsonResponse(200, {
            ok: true,
            entries: entries.map((row) => ({
                id: row.id,
                action: row.action,
                actorId: row.actorId,
                targetId: row.targetId,
                createdAt: row.createdAt,
                details: row.details,
            })),
        });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'Internal admin audit error' });
    }
}
