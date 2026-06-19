import { sanitizePayload } from '../../security/sanitizer.ts';
import { requireWifeUser } from '../../security/bffAuth.ts';
import { getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';

export const runtime = 'nodejs';

const TABLE = 'audit_logs';
const MAX_ACTION_LEN = 128;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isMissingRelationError(message: string): boolean {
  const hay = message.toLowerCase();
  return hay.includes('does not exist') || hay.includes('relation') || hay.includes('schema cache');
}

export async function POST(request: Request): Promise<Response> {
  try {
    const auth = await requireWifeUser(request);
    if (!auth.ok) return auth.response;

    let payload: unknown = null;
    try {
      payload = sanitizePayload(await request.json());
    } catch {
      payload = null;
    }
    if (!isRecord(payload) || typeof payload.action !== 'string') {
      return wifeJsonResponse(400, { ok: false, error: 'action مطلوب' });
    }

    const action = payload.action.trim().slice(0, MAX_ACTION_LEN);
    if (!action) {
      return wifeJsonResponse(400, { ok: false, error: 'action مطلوب' });
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
    }

    const { error } = await admin.from(TABLE).insert({
      user_id: auth.userId,
      action,
      details: payload.details ?? null,
    });

    if (error) {
      if (isMissingRelationError(error.message ?? '')) {
        return wifeJsonResponse(200, { ok: true, skipped: true });
      }
      return wifeJsonResponse(500, { ok: false, error: 'Failed to write audit log' });
    }

    return wifeJsonResponse(200, { ok: true });
  } catch {
    return wifeJsonResponse(500, { ok: false, error: 'Internal audit error' });
  }
}
