import { sanitizePayload } from '../../security/sanitizer.ts';
import { requireWifeCloudWrite, requireWifeUser, unwrapWifeUser } from '../../security/bffAuth.ts';
import { getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import {
  isPostgresUuidSubject,
  rejectNonUuidCloudWrite,
} from '../../security/postgresUuidSubject.ts';

export const runtime = 'nodejs';

const TABLE = 'lawyer_settings';
const LEGACY_DEV_USER_KEY = 'dev_user';
const MAX_APP_DATA_BYTES = 2_000_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function emptyCloudSyncRead(userId: string): Response | null {
  if (isPostgresUuidSubject(userId)) return null;
  return wifeJsonResponse(200, { ok: true, app_data: null });
}

function normalizeAppData(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return {};
  if (!isRecord(raw)) return null;
  const serialized = JSON.stringify(raw);
  if (serialized.length > MAX_APP_DATA_BYTES) return null;
  return raw;
}

function rejectOversizedAppData(raw: unknown): Response | null {
  if (raw == null) return null;
  try {
    const size = JSON.stringify(raw).length;
    if (size > MAX_APP_DATA_BYTES) {
      return wifeJsonResponse(413, { ok: false, error: 'Payload too large' });
    }
  } catch {
    return wifeJsonResponse(400, { ok: false, error: 'Invalid app_data' });
  }
  return null;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const authGate = unwrapWifeUser(await requireWifeUser(request));
    if ('response' in authGate) return authGate.response;
    const { userId } = authGate;

    const empty = emptyCloudSyncRead(userId);
    if (empty) return empty;

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
    }

    const { data, error } = await admin
      .from(TABLE)
      .select('app_data, updated_at')
      .eq('user_key', userId)
      .maybeSingle();

    if (error) {
      return wifeJsonResponse(500, { ok: false, error: 'Failed to load cloud sync data' });
    }

    return wifeJsonResponse(200, {
      ok: true,
      app_data: data?.app_data ?? null,
      updated_at: data?.updated_at ?? null,
    });
  } catch {
    return wifeJsonResponse(500, { ok: false, error: 'Internal cloud sync error' });
  }
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

    const oversized = rejectOversizedAppData(payload.app_data);
    if (oversized) return oversized;

    const appData = normalizeAppData(payload.app_data);
    if (appData === null) {
      return wifeJsonResponse(400, { ok: false, error: 'Invalid app_data' });
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
    }

    const updatedAt = new Date().toISOString();
    const row = {
      user_key: userId,
      app_data: appData,
      updated_at: updatedAt,
    };

    const { data, error } = await admin
      .from(TABLE)
      .upsert(row, { onConflict: 'user_key' })
      .select('user_key, app_data, updated_at')
      .single();

    if (error) {
      return wifeJsonResponse(500, { ok: false, error: 'Failed to save cloud sync data' });
    }

    return wifeJsonResponse(200, { ok: true, ...data });
  } catch {
    return wifeJsonResponse(500, { ok: false, error: 'Internal cloud sync error' });
  }
}

export async function PATCH(request: Request): Promise<Response> {
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
    if (!isRecord(payload) || payload.action !== 'migrateLegacy') {
      return wifeJsonResponse(400, { ok: false, error: 'Unsupported action' });
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
    }

    const { data: legacy, error: legacyError } = await admin
      .from(TABLE)
      .select('app_data, updated_at')
      .eq('user_key', LEGACY_DEV_USER_KEY)
      .maybeSingle();

    if (legacyError || !legacy?.app_data) {
      return wifeJsonResponse(200, { ok: true, migrated: false });
    }

    const { data: existing } = await admin
      .from(TABLE)
      .select('user_key')
      .eq('user_key', userId)
      .maybeSingle();

    if (existing?.user_key) {
      return wifeJsonResponse(200, { ok: true, migrated: false });
    }

    const { error } = await admin.from(TABLE).upsert(
      {
        user_key: userId,
        app_data: legacy.app_data,
        updated_at: legacy.updated_at ?? new Date().toISOString(),
      },
      { onConflict: 'user_key' },
    );

    if (error) {
      return wifeJsonResponse(500, { ok: false, error: 'Failed to migrate legacy cloud data' });
    }

    return wifeJsonResponse(200, { ok: true, migrated: true });
  } catch {
    return wifeJsonResponse(500, { ok: false, error: 'Internal cloud sync error' });
  }
}

export { LEGACY_DEV_USER_KEY };
