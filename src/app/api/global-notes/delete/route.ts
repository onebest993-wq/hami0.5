import { sanitizePayload } from '@/app/api/security/sanitizer';
import { requireWifeUser, unwrapWifeUser } from '@/app/api/security/bffAuth';
import { getSupabaseAdminClient } from '@/app/api/security/supabaseAdminClient';
import { wifeJsonResponse } from '@/app/api/security/wifeSecurityHeaders';

export const runtime = 'nodejs';

const TABLE = 'global_notes';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

export async function POST(request: Request): Promise<Response> {
  try {
    const authGate = unwrapWifeUser(await requireWifeUser(request));
    if ('response' in authGate) return authGate.response;
    const { userId } = authGate;

    let payload: unknown = null;
    try {
      payload = sanitizePayload(await request.json());
    } catch {
      payload = null;
    }
    if (!isRecord(payload)) {
      return wifeJsonResponse(400, { ok: false, error: 'Invalid payload' });
    }

    const externalId = typeof payload.external_id === 'string' ? payload.external_id.trim() : '';
    if (!externalId) {
      return wifeJsonResponse(400, { ok: false, error: 'external_id مطلوب' });
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
    }

    const { error } = await admin.from(TABLE).delete().eq('user_id', userId).eq('external_id', externalId);
    if (error) {
      return wifeJsonResponse(500, { ok: false, error: 'Failed to delete global note' });
    }

    return wifeJsonResponse(200, { ok: true });
  } catch {
    return wifeJsonResponse(500, { ok: false, error: 'Internal global notes delete error' });
  }
}

