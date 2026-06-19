import { createClient } from '@supabase/supabase-js';
import {
  extractUserTokenFromRequest,
  getVerifiedTokenSubject,
  isTokenAuthorized,
  verifyWifeSignature,
  wifeForbiddenResponse, wifeSignatureFailedResponse,
  wifeUnauthorizedResponse,
} from '../../security/wifeValidator.ts';
import { isStoragePathOwnedByUser, resolveUploadBucket } from '../uploadStorageUtils.ts';

export const runtime = 'nodejs';

const MAX_PATHS = 20;

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

function normalizePaths(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed || out.includes(trimmed)) continue;
    out.push(trimmed);
    if (out.length >= MAX_PATHS) break;
  }
  return out;
}

/**
 * WIFE-protected storage delete — user may only remove objects under their prefix.
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
    if (!isRecord(payload)) {
      return json(400, { ok: false, error: 'paths مطلوب' });
    }

    const paths = normalizePaths(payload.paths);
    if (paths.length === 0) {
      return json(400, { ok: false, error: 'paths مطلوب' });
    }

    for (const path of paths) {
      if (!isStoragePathOwnedByUser(path, userId)) {
        return json(403, { ok: false, error: 'Forbidden: path not owned by current user' });
      }
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return json(500, { ok: false, error: 'Server storage client is not configured' });
    }

    const bucket = resolveUploadBucket();
    const { error } = await admin.storage.from(bucket).remove(paths);
    if (error) {
      return json(500, { ok: false, error: 'Storage remove failed' });
    }

    return json(200, { ok: true, removed: paths.length });
  } catch {
    return json(500, { ok: false, error: 'Internal storage remove error' });
  }
}
