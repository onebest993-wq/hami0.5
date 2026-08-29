import { requireTrustedHeadquartersAdmin } from '../../security/requireTrustedHeadquartersAdmin.ts';
import { getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import { wifeJsonNoStore } from '../../security/wifeSecurityHeaders.ts';
import { consumeRateLimitSlot } from '../../security/wifeRateLimitStore.ts';
import { fetchHeadquartersUser, listHeadquartersUsers } from '../../security/headquartersUsers.ts';
import { parseHqDirectoryListQuery } from '@/app/domain/admin/hqDirectoryQuery';
import { isPostgresUuidSubject } from '../../security/postgresUuidSubject.ts';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
    try {
        const gate = await requireTrustedHeadquartersAdmin(request);
        if (!gate.ok) return gate.response;

        const allowed = await consumeRateLimitSlot(`admin-hq-users:${gate.userId}`, {
            maxRequests: 120,
            windowMs: 60_000,
        });
        if (!allowed) {
            return wifeJsonNoStore(429, { ok: false, error: 'تجاوزت حد عمليات المقر — حاول لاحقاً' });
        }

        const admin = getSupabaseAdminClient();
        if (!admin) {
            return wifeJsonNoStore(503, { ok: false, error: 'Database client not configured' });
        }

        const query = parseHqDirectoryListQuery(new URL(request.url).searchParams);
        const listed = await listHeadquartersUsers(admin, query);
        const includeId = query.includeId;
        if (isPostgresUuidSubject(includeId) && !listed.users.some((user) => user.id === includeId)) {
            const extra = await fetchHeadquartersUser(admin, includeId);
            if (extra) {
                listed.users = [extra, ...listed.users].slice(0, query.limit);
            }
        }
        return wifeJsonNoStore(200, {
            ok: true,
            users: listed.users,
            total: listed.matched,
            usersTotal: listed.usersTotal,
            offset: listed.offset,
            limit: listed.limit,
            hasMore: listed.hasMore,
            matchedExact: listed.matchedExact,
            capped: listed.capped,
        });
    } catch {
        return wifeJsonNoStore(500, { ok: false, error: 'Internal admin users error' });
    }
}
