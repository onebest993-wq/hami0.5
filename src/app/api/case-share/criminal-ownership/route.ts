import { requireWifeCloudWrite, unwrapWifeUser } from '../../security/bffAuth.ts';
import { sanitizePayload } from '../../security/sanitizer.ts';
import { getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import { rejectNonUuidCloudWrite } from '../../security/postgresUuidSubject.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';

export const runtime = 'nodejs';

const TABLE = 'criminal_case_ownership';
const MAX_EXTERNAL_ID_LEN = 200;

function isRecord(v: unknown): v is Record<string, unknown> {
    return Boolean(v) && typeof v === 'object';
}

function normalizeDossierId(raw: unknown): string | null {
    if (typeof raw !== 'string' && typeof raw !== 'number') return null;
    const trimmed = String(raw).trim();
    if (!trimmed || trimmed === 'undefined') return null;
    return trimmed.slice(0, MAX_EXTERNAL_ID_LEN);
}

async function auth(request: Request): Promise<{ userId: string } | Response> {
    const unwrapped = unwrapWifeUser(await requireWifeCloudWrite(request));
    if ('response' in unwrapped) return unwrapped.response;
    return { userId: unwrapped.userId };
}

/**
 * تسجيل / إلغاء إثبات ملكية إضبارة جزائية قبل CaseShare create على الخادم.
 * لا يخزّن حمولة — فقط (user_id, external_id).
 */
export async function POST(request: Request): Promise<Response> {
    try {
        const authResult = await auth(request);
        if (authResult instanceof Response) return authResult;
        const { userId } = authResult;

        const denied = rejectNonUuidCloudWrite(userId);
        if (denied) return denied;

        let payload: unknown = null;
        try {
            payload = sanitizePayload(await request.json());
        } catch {
            payload = null;
        }
        if (!isRecord(payload) || typeof payload.action !== 'string') {
            return wifeJsonResponse(400, { ok: false, error: 'action مطلوب' });
        }

        const dossierId = normalizeDossierId(payload.dossierId);
        if (!dossierId) {
            return wifeJsonResponse(400, { ok: false, error: 'dossierId مطلوب' });
        }

        const admin = getSupabaseAdminClient();
        if (!admin) {
            return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
        }

        if (payload.action === 'register') {
            const nowIso = new Date().toISOString();
            const { error } = await admin.from(TABLE).upsert(
                {
                    user_id: userId,
                    external_id: dossierId,
                    updated_at: nowIso,
                },
                { onConflict: 'user_id,external_id' },
            );
            if (error) {
                return wifeJsonResponse(500, { ok: false, error: 'Failed to register ownership' });
            }
            return wifeJsonResponse(200, { ok: true, dossierId });
        }

        if (payload.action === 'unregister') {
            const { error } = await admin
                .from(TABLE)
                .delete()
                .eq('user_id', userId)
                .eq('external_id', dossierId);
            if (error) {
                return wifeJsonResponse(500, { ok: false, error: 'Failed to unregister ownership' });
            }
            return wifeJsonResponse(200, { ok: true, dossierId });
        }

        return wifeJsonResponse(400, { ok: false, error: 'إجراء غير معروف' });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'Internal server error' });
    }
}
