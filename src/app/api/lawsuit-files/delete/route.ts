import { sanitizePayload } from '@/app/api/security/sanitizer';
import { requireWifeCloudWrite, unwrapWifeUser } from '@/app/api/security/bffAuth';
import { getSupabaseAdminClient } from '@/app/api/security/supabaseAdminClient';
import { wifeJsonResponse } from '@/app/api/security/wifeSecurityHeaders';
import { rejectNonUuidCloudWrite } from '@/app/api/security/postgresUuidSubject';

export const runtime = 'nodejs';

const TABLE = 'lawsuit_files';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

export async function POST(request: Request): Promise<Response> {
  try {
    const authGate = unwrapWifeUser(await requireWifeCloudWrite(request));
    if ('response' in authGate) return authGate.response;
    const { userId } = authGate;
    const denied = rejectNonUuidCloudWrite(userId);
    if (denied) return denied;

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
      return wifeJsonResponse(500, { ok: false, error: 'Failed to delete lawsuit file' });
    }

    return wifeJsonResponse(200, { ok: true });
  } catch {
    return wifeJsonResponse(500, { ok: false, error: 'Internal lawsuit delete error' });
  }
}

