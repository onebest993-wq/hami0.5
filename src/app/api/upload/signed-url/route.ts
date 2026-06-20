import { createClient } from '@supabase/supabase-js';
import {
  extractUserTokenFromRequest,
  getVerifiedTokenSubject,
  isTokenAuthorized,
  verifyWifeSignature,
  wifeForbiddenResponse, wifeSignatureFailedResponse,
  wifeUnauthorizedResponse,
} from '../../security/wifeValidator.ts';
import {
  isStoragePathOwnedByUser,
  resolveUploadBucket,
  SIGNED_URL_TTL_SEC,
} from '../uploadStorageUtils.ts';

export const runtime = 'nodejs';

function json(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function getSupabaseAdminClient() {
  const supabaseUrl = (process.env.SUPABASE_URL ?? '').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

/**
 * WIFE-protected signed URL for an object the user already owns in storage.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const userToken = extractUserTokenFromRequest(request);
    if (!userToken || !(await isTokenAuthorized(userToken))) {
      return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
    }
    if (!(await verifyWifeSignature(request, userToken))) {
      return wifeSignatureFailedResponse(request);
    }

    const userId = await getVerifiedTokenSubject(userToken);
    if (!userId) return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });

    const payload = (await request.json().catch(() => null)) as unknown;
    if (!isRecord(payload) || typeof payload.path !== 'string' || !payload.path.trim()) {
      return json(400, { ok: false, error: 'path مطلوب' });
    }

    const path = payload.path.trim();
    if (!isStoragePathOwnedByUser(path, userId)) {
      return json(403, { ok: false, error: 'Forbidden: path not owned by current user' });
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return json(500, { ok: false, error: 'Server storage client is not configured' });
    }

    const bucket = resolveUploadBucket();
    const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SEC);
    if (error || !data?.signedUrl) {
      return json(404, { ok: false, error: 'Object not found or signed URL failed' });
    }

    return json(200, { ok: true, downloadUrl: data.signedUrl, path });
  } catch {
    return json(500, { ok: false, error: 'Internal signed-url error' });
  }
}
