import { requireWifeUser, unwrapWifeUser } from '../../security/bffAuth.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { consumeRateLimitSlot } from '../../security/wifeRateLimitStore.ts';
import { getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import { isPostgresUuidSubject } from '../../security/postgresUuidSubject.ts';

export const runtime = 'nodejs';

const MAX_IDS = 40;

function parseRequestedIds(url: URL): string[] {
    const single = url.searchParams.get('userId')?.trim() ?? '';
    const rawList = url.searchParams.get('ids')?.trim() ?? '';
    const fromList = rawList
        ? rawList.split(',').map((part) => part.trim()).filter(Boolean)
        : [];
    const merged = single ? [single, ...fromList] : fromList;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of merged) {
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(id);
    }
    return out;
}

function isMissingBadgeColumn(message: string): boolean {
    const hay = message.toLowerCase();
    return hay.includes('public_verified_badge') && (hay.includes('does not exist') || hay.includes('schema cache'));
}

/**
 * علامة التوثيق العامة — يقرأها أي محامٍ مسجّل ليعرضها على صورة زميل.
 * المصدر: profiles.public_verified_badge (المقر فقط يكتبها). ليست KYC.
 */
export async function GET(request: Request): Promise<Response> {
    try {
        const authGate = unwrapWifeUser(await requireWifeUser(request));
        if ('response' in authGate) return authGate.response;
        const { userId } = authGate;

        const allowed = await consumeRateLimitSlot(`public-verified-badge:${userId}`, {
            maxRequests: 80,
            windowMs: 60_000,
        });
        if (!allowed) {
            return wifeJsonResponse(429, { ok: false, error: 'تجاوزت حد الطلبات — حاول لاحقاً' });
        }

        const ids = parseRequestedIds(new URL(request.url));
        if (ids.length === 0) {
            return wifeJsonResponse(400, { ok: false, error: 'معرّف المستخدم مطلوب' });
        }
        if (ids.length > MAX_IDS) {
            return wifeJsonResponse(400, { ok: false, error: 'عدد المعرّفات أكبر من المسموح' });
        }
        if (ids.some((id) => !isPostgresUuidSubject(id))) {
            return wifeJsonResponse(400, { ok: false, error: 'معرّف غير صالح' });
        }

        const admin = getSupabaseAdminClient();
        if (!admin) {
            return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
        }

        const query = admin
            .from('profiles')
            .select('id, public_verified_badge, is_deleted')
            .in('id', ids);
        const { data, error } = await query;
        if (error) {
            if (isMissingBadgeColumn(error.message ?? '')) {
                const badges: Record<string, boolean> = {};
                for (const id of ids) badges[id] = false;
                return wifeJsonResponse(200, { ok: true, badges });
            }
            return wifeJsonResponse(500, { ok: false, error: 'تعذّر قراءة علامة التوثيق' });
        }

        const badges: Record<string, boolean> = {};
        for (const id of ids) badges[id] = false;
        if (Array.isArray(data)) {
            for (const row of data) {
                if (!row || typeof row !== 'object') continue;
                const id = String((row as { id?: unknown }).id ?? '').trim();
                if (!id) continue;
                const deleted = (row as { is_deleted?: unknown }).is_deleted === true;
                badges[id] =
                    !deleted && (row as { public_verified_badge?: unknown }).public_verified_badge === true;
            }
        }

        if (ids.length === 1) {
            const only = ids[0]!;
            return wifeJsonResponse(200, { ok: true, userId: only, shown: badges[only] === true, badges });
        }
        return wifeJsonResponse(200, { ok: true, badges });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'Internal public badge error' });
    }
}
