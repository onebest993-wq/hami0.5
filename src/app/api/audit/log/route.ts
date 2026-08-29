import { isJsonObjectRecord, sanitizePayload } from '../../security/sanitizer.ts';
import { requireWifeUser, unwrapWifeUser } from '../../security/bffAuth.ts';
import { getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';

export const runtime = 'nodejs';

const TABLE = 'audit_logs';
const MAX_ACTION_LEN = 128;
const MAX_DETAILS_CHARS = 4_096;

/** أحداث يكتبها العميل بعد نجاح مسار حقيقي — ليست صلاحيات ولا أحداث مقر. */
const CLIENT_AUDIT_ACTIONS = new Set([
  'login_success',
  'local_guest_enter',
  'lawyer_register_account',
  'lawyer_register_pending',
  'dev_unlock_enter',
]);

function clipClientAuditDetails(details: unknown): unknown {
  if (details == null) return null;
  try {
    const serialized = JSON.stringify(details);
    if (!serialized) return null;
    if (serialized.length > MAX_DETAILS_CHARS) return { truncated: true };
    return details;
  } catch {
    return null;
  }
}

function normalizeClientAuditAction(action: string): string {
  return action
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, '')
    .trim();
}

function isMissingRelationError(message: string): boolean {
  const hay = message.toLowerCase();
  return hay.includes('does not exist') || hay.includes('relation') || hay.includes('schema cache');
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
    if (!isJsonObjectRecord(payload) || typeof payload.action !== 'string') {
      return wifeJsonResponse(400, { ok: false, error: 'action مطلوب' });
    }

    const action = normalizeClientAuditAction(payload.action).slice(0, MAX_ACTION_LEN);
    if (!action) {
      return wifeJsonResponse(400, { ok: false, error: 'action مطلوب' });
    }
    if (/^hq\s*:/i.test(action)) {
      return wifeJsonResponse(403, { ok: false, error: 'Headquarters audit is server-only' });
    }
    if (!CLIENT_AUDIT_ACTIONS.has(action)) {
      return wifeJsonResponse(400, { ok: false, error: 'action غير مسموح' });
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
    }

    const { error } = await admin.from(TABLE).insert({
      user_id: userId,
      action,
      details: clipClientAuditDetails(payload.details),
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
