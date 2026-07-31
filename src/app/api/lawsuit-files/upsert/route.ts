import { sanitizePayload } from '@/app/api/security/sanitizer';
import { requireWifeUser, unwrapWifeUser } from '@/app/api/security/bffAuth';
import { getSupabaseAdminClient } from '@/app/api/security/supabaseAdminClient';
import { wifeJsonResponse } from '@/app/api/security/wifeSecurityHeaders';

export const runtime = 'nodejs';

const TABLE = 'lawsuit_files';
const MAX_EXTERNAL_ID_LEN = 200;
const MAX_TEXT_LEN = 2_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function normalizeText(raw: unknown, maxLen: number): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'undefined') return null;
  return trimmed.slice(0, maxLen);
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

    const externalId = normalizeText(payload.external_id, MAX_EXTERNAL_ID_LEN);
    const caseNo = normalizeText(payload.case_no, 256);
    const court = normalizeText(payload.court, MAX_TEXT_LEN);
    const stage = normalizeText(payload.stage, 64);
    const encryptedData = normalizeText(payload.encrypted_data, 2_000_000);
    const dataSignature = normalizeText(payload.data_signature, 256);
    if (!externalId || !caseNo || !court || !stage || !encryptedData || !dataSignature) {
      return wifeJsonResponse(400, { ok: false, error: 'Missing required fields' });
    }

    const caseType = normalizeText(payload.case_type, 128);
    const parentId = normalizeText(payload.parent_id, 128);
    const status = normalizeText(payload.status, 32) ?? 'active';
    const securityVersion = Number.isFinite(Number(payload.security_version))
      ? Number(payload.security_version)
      : 3;

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
    }

    const nowIso = new Date().toISOString();
    const row = {
      user_id: userId,
      external_id: externalId,
      case_no: caseNo,
      court,
      stage,
      case_type: caseType ?? null,
      parent_id: parentId ?? null,
      encrypted_data: encryptedData,
      data_signature: dataSignature,
      security_version: securityVersion,
      status,
      updated_at: nowIso,
    };

    const { data, error } = await admin
      .from(TABLE)
      .upsert(row, { onConflict: 'user_id,external_id' })
      .select('id,external_id')
      .single();

    if (error) {
      return wifeJsonResponse(500, { ok: false, error: 'Failed to upsert lawsuit file' });
    }

    return wifeJsonResponse(200, { ok: true, row: data ?? null });
  } catch {
    return wifeJsonResponse(500, { ok: false, error: 'Internal lawsuit upsert error' });
  }
}

