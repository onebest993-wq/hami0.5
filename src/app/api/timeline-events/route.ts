import { sanitizePayload } from '../security/sanitizer.ts';
import { requireWifeUser, unwrapWifeUser } from '../security/bffAuth.ts';
import { getSupabaseAdminClient } from '../security/supabaseAdminClient.ts';
import { wifeJsonResponse } from '../security/wifeSecurityHeaders.ts';
import type { TimelineEvent } from '@/app/types/execution';

export const runtime = 'nodejs';

const TABLE = 'timeline_events';
const MAX_EXECUTION_ID_LEN = 128;
const MAX_EVENT_ID_LEN = 128;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function payloadWithoutSnapshot(event: TimelineEvent): Record<string, unknown> {
  const { snapshot: _snap, ...rest } = event;
  return rest as Record<string, unknown>;
}

function normalizeExecutionFileId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed.length > MAX_EXECUTION_ID_LEN) return null;
  return trimmed;
}

function buildRow(userId: string, executionFileId: string, event: TimelineEvent, snapshotData?: unknown) {
  const snap = snapshotData !== undefined ? snapshotData : event.snapshot;
  return {
    user_id: userId,
    execution_file_id: executionFileId,
    event_id: String(event.id).slice(0, MAX_EVENT_ID_LEN),
    title: String(event.title ?? '').slice(0, 500),
    description: event.description ?? null,
    event_type: event.type != null ? String(event.type).slice(0, 64) : null,
    event_date: event.date ?? null,
    event_timestamp: event.timestamp ?? null,
    source: event.source ?? null,
    metadata: (event.metadata as Record<string, unknown>) ?? null,
    snapshot_data: snap ?? null,
    payload: payloadWithoutSnapshot(event),
  };
}

export async function GET(request: Request): Promise<Response> {
  try {
    const authGate = unwrapWifeUser(await requireWifeUser(request));
    if ('response' in authGate) return authGate.response;
    const { userId } = authGate;

    const url = new URL(request.url);
    const executionFileId = normalizeExecutionFileId(url.searchParams.get('executionFileId'));
    if (!executionFileId) {
      return wifeJsonResponse(400, { ok: false, error: 'executionFileId مطلوب' });
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
    }

    const { data, error } = await admin
      .from(TABLE)
      .select(
        'id,user_id,execution_file_id,event_id,title,description,event_type,event_date,event_timestamp,source,metadata,snapshot_data,payload,created_at',
      )
      .eq('execution_file_id', executionFileId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return wifeJsonResponse(500, { ok: false, error: 'Failed to load timeline events' });
    }

    return wifeJsonResponse(200, { ok: true, rows: data ?? [] });
  } catch {
    return wifeJsonResponse(500, { ok: false, error: 'Internal timeline error' });
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
    if (!isRecord(payload)) {
      return wifeJsonResponse(400, { ok: false, error: 'Invalid payload' });
    }

    const executionFileId = normalizeExecutionFileId(payload.executionFileId);
    if (!executionFileId) {
      return wifeJsonResponse(400, { ok: false, error: 'executionFileId مطلوب' });
    }

    const event = payload.event as TimelineEvent | undefined;
    if (!event || event.id == null) {
      return wifeJsonResponse(400, { ok: false, error: 'event مطلوب' });
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
    }

    const row = buildRow(userId, executionFileId, event, payload.snapshotData);
    const { error } = await admin.from(TABLE).upsert(row, {
      onConflict: 'execution_file_id,event_id',
    });
    if (error) {
      return wifeJsonResponse(500, { ok: false, error: 'Failed to upsert timeline event' });
    }

    return wifeJsonResponse(200, { ok: true });
  } catch {
    return wifeJsonResponse(500, { ok: false, error: 'Internal timeline error' });
  }
}
