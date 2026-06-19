import { sanitizePayload } from '../../security/sanitizer.ts';
import { requireWifeUser } from '../../security/bffAuth.ts';
import { isAdminRequest } from '../../security/adminCheck.ts';
import { getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';

export const runtime = 'nodejs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

export async function POST(request: Request): Promise<Response> {
  try {
    const auth = await requireWifeUser(request);
    if (!auth.ok) return auth.response;

    if (!(await isAdminRequest(request, auth.userId))) {
      return wifeJsonResponse(403, { ok: false, error: 'Unauthorized Access' });
    }

    let payload: unknown = null;
    try {
      payload = sanitizePayload(await request.json());
    } catch {
      payload = null;
    }
    if (!isRecord(payload)) {
      return wifeJsonResponse(400, { ok: false, error: 'Invalid payload' });
    }

    const requesterId = typeof payload.requesterId === 'string' ? payload.requesterId.trim() : '';
    const targetUserId = typeof payload.targetUserId === 'string' ? payload.targetUserId.trim() : '';
    if (!requesterId || requesterId !== auth.userId) {
      return wifeJsonResponse(403, { ok: false, error: 'requesterId mismatch' });
    }
    if (!targetUserId) {
      return wifeJsonResponse(400, { ok: false, error: 'targetUserId مطلوب' });
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
    }

    const updates = isRecord(payload.updates) ? payload.updates : { is_banned: true };
    const { error } = await admin.from('profiles').update(updates).eq('id', targetUserId);
    if (error) {
      return wifeJsonResponse(500, { ok: false, error: 'Ban update failed' });
    }

    return wifeJsonResponse(200, { ok: true });
  } catch {
    return wifeJsonResponse(500, { ok: false, error: 'Internal admin ban error' });
  }
}
