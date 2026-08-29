import { sanitizePayload } from '@/app/api/security/sanitizer';
import { requireWifeCloudWrite, unwrapWifeUser } from '@/app/api/security/bffAuth';
import { getSupabaseAdminClient } from '@/app/api/security/supabaseAdminClient';
import { wifeJsonResponse } from '@/app/api/security/wifeSecurityHeaders';
import { rejectNonUuidCloudWrite } from '@/app/api/security/postgresUuidSubject';

export const runtime = 'nodejs';

const TABLE = 'global_notes';
const MAX_EXTERNAL_ID_LEN = 200;
const MAX_TITLE_LEN = 500;
const MAX_CONTENT_LEN = 200_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function normalizeText(raw: unknown, maxLen: number): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'undefined') return null;
  return trimmed.slice(0, maxLen);
}

function normalizeTags(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out = raw
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter((v) => v)
    .slice(0, 20)
    .map((v) => v.slice(0, 64));
  return out;
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

    const externalId = normalizeText(payload.external_id, MAX_EXTERNAL_ID_LEN);
    const content = normalizeText(payload.content, MAX_CONTENT_LEN);
    if (!externalId || !content) {
      return wifeJsonResponse(400, { ok: false, error: 'Missing required fields' });
    }

    const title = normalizeText(payload.title, MAX_TITLE_LEN);
    const category = normalizeText(payload.category, 32);
    const tags = normalizeTags(payload.tags);

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
    }

    const nowIso = new Date().toISOString();
    const row = {
      user_id: userId,
      external_id: externalId,
      title: title ?? null,
      content,
      category: category ?? null,
      tags: tags ?? null,
      updated_at: nowIso,
    };

    const { data, error } = await admin
      .from(TABLE)
      .upsert(row, { onConflict: 'user_id,external_id' })
      .select('id,external_id')
      .single();

    if (error) {
      return wifeJsonResponse(500, { ok: false, error: 'Failed to upsert global note' });
    }

    return wifeJsonResponse(200, { ok: true, row: data ?? null });
  } catch {
    return wifeJsonResponse(500, { ok: false, error: 'Internal global notes upsert error' });
  }
}

