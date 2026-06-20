import { sanitizePayload } from '../../security/sanitizer.ts';
import { requireWifeUser, unwrapWifeUser } from '../../security/bffAuth.ts';
import { getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';

export const runtime = 'nodejs';

const TABLE = 'calendar_tombstones';
const MAX_EVENT_ID_LEN = 128;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function normalizeEventId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_EVENT_ID_LEN) return null;
  return trimmed;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const authGate = unwrapWifeUser(await requireWifeUser(request));
    if ('response' in authGate) return authGate.response;
    const { userId } = authGate;

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
    }

    const { data, error } = await admin
      .from(TABLE)
      .select('event_id')
      .eq('user_id', userId);

    if (error) {
      return wifeJsonResponse(500, { ok: false, error: 'Failed to load tombstones' });
    }

    const eventIds = (Array.isArray(data) ? data : [])
      .map((row) => (row && typeof row.event_id === 'string' ? row.event_id : null))
      .filter((id): id is string => Boolean(id));

    return wifeJsonResponse(200, { ok: true, eventIds });
  } catch {
    return wifeJsonResponse(500, { ok: false, error: 'Internal tombstones error' });
  }
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
    if (!isRecord(payload) || typeof payload.action !== 'string') {
      return wifeJsonResponse(400, { ok: false, error: 'action مطلوب' });
    }

    const eventId = normalizeEventId(payload.eventId);
    if (!eventId) {
      return wifeJsonResponse(400, { ok: false, error: 'eventId مطلوب' });
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
    }

    if (payload.action === 'mark') {
      const { error } = await admin.from(TABLE).upsert(
        { user_id: userId, event_id: eventId },
        { onConflict: 'user_id,event_id' },
      );
      if (error) {
        return wifeJsonResponse(500, { ok: false, error: 'Failed to mark tombstone' });
      }
      return wifeJsonResponse(200, { ok: true, action: 'mark' });
    }

    if (payload.action === 'clear') {
      const { error } = await admin
        .from(TABLE)
        .delete()
        .eq('user_id', userId)
        .eq('event_id', eventId);
      if (error) {
        return wifeJsonResponse(500, { ok: false, error: 'Failed to clear tombstone' });
      }
      return wifeJsonResponse(200, { ok: true, action: 'clear' });
    }

    return wifeJsonResponse(400, { ok: false, error: `Unknown action: ${payload.action}` });
  } catch {
    return wifeJsonResponse(500, { ok: false, error: 'Internal tombstones error' });
  }
}
