/**
 * Server-side stolen/cloned JWT detection for WIFE.
 * Storage priority: Redis (Upstash) → Supabase → in-memory (non-production only).
 */
import { extractJwtSessionFields } from '@/app/security/jwtFields.ts';
import { getSupabaseAdminClient } from './supabaseAdminClient.ts';
import { supabasePrivilegedKeyEnvName } from './supabasePrivilegedEnv.ts';

const IAT_GRACE_PERIOD_MS = 45_000;
const SESSION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_SESSION_TABLE = 'wife_token_sessions';
const DEVICE_ID_RE = /^[A-Za-z0-9\-_]{8,128}$/;

export type StolenTokenStatus = 'valid' | 'stolen' | 'cloned';

export interface StolenTokenVerdict {
  status: StolenTokenStatus;
  reason?: string;
}

interface TokenSessionRecord {
  sub: string;
  jti: string;
  iat: number;
  deviceId: string;
  expiresAt: number;
}

type SessionStore = {
  listActiveBySub(sub: string, nowMs: number): Promise<TokenSessionRecord[]>;
  upsertSession(record: TokenSessionRecord): Promise<void>;
  deleteExpired(nowMs: number): Promise<void>;
  deleteActiveBySub(sub: string, nowMs: number): Promise<void>;
};

const IN_MEMORY_SESSIONS = new Map<string, TokenSessionRecord>();

function sessionKey(sub: string, jti: string): string {
  return `${sub}:${jti}`;
}

function getEnv(name: string): string {
  const raw = process.env[name];
  return typeof raw === 'string' ? raw.trim() : '';
}

function isProduction(): boolean {
  return getEnv('NODE_ENV').toLowerCase() === 'production';
}

function normalizeDeviceId(raw: string | null | undefined): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed || !DEVICE_ID_RE.test(trimmed)) return '';
  return trimmed;
}

function pruneInMemory(nowMs: number): void {
  for (const [key, record] of IN_MEMORY_SESSIONS.entries()) {
    if (record.expiresAt <= nowMs) IN_MEMORY_SESSIONS.delete(key);
  }
}

const memoryStore: SessionStore = {
  async listActiveBySub(sub: string, nowMs: number): Promise<TokenSessionRecord[]> {
    pruneInMemory(nowMs);
    return [...IN_MEMORY_SESSIONS.values()].filter((r) => r.sub === sub && r.expiresAt > nowMs);
  },
  async upsertSession(record: TokenSessionRecord): Promise<void> {
    IN_MEMORY_SESSIONS.set(sessionKey(record.sub, record.jti), record);
  },
  async deleteExpired(nowMs: number): Promise<void> {
    pruneInMemory(nowMs);
  },
  async deleteActiveBySub(sub: string, nowMs: number): Promise<void> {
    pruneInMemory(nowMs);
    for (const [key, record] of IN_MEMORY_SESSIONS.entries()) {
      if (record.sub === sub && record.expiresAt > nowMs) IN_MEMORY_SESSIONS.delete(key);
    }
  },
};

function hasRedisConfig(): boolean {
  return Boolean(getEnv('WIFE_REDIS_REST_URL') && getEnv('WIFE_REDIS_REST_TOKEN'));
}

function redisSessionKey(sub: string, jti: string): string {
  return encodeURIComponent(`wife:toksess:${sub}:${jti}`);
}

const redisStore: SessionStore = {
  async listActiveBySub(sub: string, nowMs: number): Promise<TokenSessionRecord[]> {
    const redisUrl = getEnv('WIFE_REDIS_REST_URL');
    const redisToken = getEnv('WIFE_REDIS_REST_TOKEN');
    if (!redisUrl || !redisToken) throw new Error('Redis session store is not configured.');

    const prefix = encodeURIComponent(`wife:toksess:${sub}:`);
    const scanUrl = `${redisUrl.replace(/\/+$/, '')}/keys/${prefix}*`;
    const scanRes = await fetch(scanUrl, {
      headers: { Authorization: `Bearer ${redisToken}` },
    });
    if (!scanRes.ok) throw new Error(`Redis session scan failed: ${scanRes.status}`);

    const scanBody = (await scanRes.json().catch(() => null)) as { result?: unknown } | null;
    const keys = Array.isArray(scanBody?.result) ? scanBody.result.filter((k): k is string => typeof k === 'string') : [];
    const records: TokenSessionRecord[] = [];

    for (const key of keys) {
      const getUrl = `${redisUrl.replace(/\/+$/, '')}/get/${encodeURIComponent(key)}`;
      const getRes = await fetch(getUrl, { headers: { Authorization: `Bearer ${redisToken}` } });
      if (!getRes.ok) continue;
      const getBody = (await getRes.json().catch(() => null)) as { result?: unknown } | null;
      if (typeof getBody?.result !== 'string' || !getBody.result) continue;
      try {
        const parsed = JSON.parse(getBody.result) as TokenSessionRecord;
        if (parsed.sub === sub && parsed.expiresAt > nowMs) records.push(parsed);
      } catch {
        /* skip malformed */
      }
    }
    return records;
  },
  async upsertSession(record: TokenSessionRecord): Promise<void> {
    const redisUrl = getEnv('WIFE_REDIS_REST_URL');
    const redisToken = getEnv('WIFE_REDIS_REST_TOKEN');
    if (!redisUrl || !redisToken) throw new Error('Redis session store is not configured.');

    const ttlMs = Math.max(60_000, record.expiresAt - Date.now());
    const key = redisSessionKey(record.sub, record.jti);
    const endpoint = `${redisUrl.replace(/\/+$/, '')}/set/${key}/${encodeURIComponent(JSON.stringify(record))}?PX=${ttlMs}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${redisToken}` },
    });
    if (!response.ok) throw new Error(`Redis session set failed: ${response.status}`);
  },
  async deleteExpired(_nowMs: number): Promise<void> {
    /* Redis TTL handles expiry */
  },
  async deleteActiveBySub(sub: string, nowMs: number): Promise<void> {
    const redisUrl = getEnv('WIFE_REDIS_REST_URL');
    const redisToken = getEnv('WIFE_REDIS_REST_TOKEN');
    if (!redisUrl || !redisToken) throw new Error('Redis session store is not configured.');

    const prefix = encodeURIComponent(`wife:toksess:${sub}:`);
    const scanUrl = `${redisUrl.replace(/\/+$/, '')}/keys/${prefix}*`;
    const scanRes = await fetch(scanUrl, {
      headers: { Authorization: `Bearer ${redisToken}` },
    });
    if (!scanRes.ok) throw new Error(`Redis session scan failed: ${scanRes.status}`);

    const scanBody = (await scanRes.json().catch(() => null)) as { result?: unknown } | null;
    const keys = Array.isArray(scanBody?.result) ? scanBody.result.filter((k): k is string => typeof k === 'string') : [];
    for (const key of keys) {
      const getUrl = `${redisUrl.replace(/\/+$/, '')}/get/${encodeURIComponent(key)}`;
      const getRes = await fetch(getUrl, { headers: { Authorization: `Bearer ${redisToken}` } });
      if (!getRes.ok) continue;
      const getBody = (await getRes.json().catch(() => null)) as { result?: unknown } | null;
      if (typeof getBody?.result !== 'string' || !getBody.result) continue;
      try {
        const parsed = JSON.parse(getBody.result) as TokenSessionRecord;
        if (parsed.sub !== sub || parsed.expiresAt <= nowMs) continue;
      } catch {
        continue;
      }
      const delUrl = `${redisUrl.replace(/\/+$/, '')}/del/${encodeURIComponent(key)}`;
      await fetch(delUrl, { method: 'POST', headers: { Authorization: `Bearer ${redisToken}` } });
    }
  },
};

function hasSupabaseConfig(): boolean {
  return Boolean(getEnv('SUPABASE_URL') && getEnv(supabasePrivilegedKeyEnvName()));
}

function getSupabaseAdminClientForSessions(): ReturnType<typeof getSupabaseAdminClient> {
  return getSupabaseAdminClient();
}

const supabaseStore: SessionStore = {
  async listActiveBySub(sub: string, nowMs: number): Promise<TokenSessionRecord[]> {
    const admin = getSupabaseAdminClientForSessions();
    if (!admin) throw new Error('Supabase session store is not configured.');
    const table = getEnv('WIFE_TOKEN_SESSION_TABLE') || DEFAULT_SESSION_TABLE;

    void admin.from(table).delete().lt('expires_at_ms', nowMs);

    const { data, error } = await admin
      .from(table)
      .select('sub,jti,iat_ms,device_id,expires_at_ms')
      .eq('sub', sub)
      .gt('expires_at_ms', nowMs);
    if (error) throw new Error(`Supabase session list failed: ${error.message}`);

    return (data ?? []).map((row: Record<string, unknown>) => ({
      sub: String(row.sub ?? ''),
      jti: String(row.jti ?? ''),
      iat: Number(row.iat_ms ?? 0),
      deviceId: String(row.device_id ?? ''),
      expiresAt: Number(row.expires_at_ms ?? 0),
    }));
  },
  async upsertSession(record: TokenSessionRecord): Promise<void> {
    const admin = getSupabaseAdminClientForSessions();
    if (!admin) throw new Error('Supabase session store is not configured.');
    const table = getEnv('WIFE_TOKEN_SESSION_TABLE') || DEFAULT_SESSION_TABLE;

    const { error } = await admin.from(table).upsert(
      {
        sub: record.sub,
        jti: record.jti,
        iat_ms: record.iat,
        device_id: record.deviceId,
        expires_at_ms: record.expiresAt,
      },
      { onConflict: 'sub,jti' },
    );
    if (error) throw new Error(`Supabase session upsert failed: ${error.message}`);
  },
  async deleteExpired(nowMs: number): Promise<void> {
    const admin = getSupabaseAdminClientForSessions();
    if (!admin) return;
    const table = getEnv('WIFE_TOKEN_SESSION_TABLE') || DEFAULT_SESSION_TABLE;
    void admin.from(table).delete().lt('expires_at_ms', nowMs);
  },
  async deleteActiveBySub(sub: string, nowMs: number): Promise<void> {
    const admin = getSupabaseAdminClientForSessions();
    if (!admin) throw new Error('Supabase session store is not configured.');
    const table = getEnv('WIFE_TOKEN_SESSION_TABLE') || DEFAULT_SESSION_TABLE;
    const { error } = await admin.from(table).delete().eq('sub', sub).gt('expires_at_ms', nowMs);
    if (error) throw new Error(`Supabase session revoke failed: ${error.message}`);
  },
};

function resolvePrimaryStore(): SessionStore | null {
  if (hasRedisConfig()) return redisStore;
  if (hasSupabaseConfig()) return supabaseStore;
  if (!isProduction()) return memoryStore;
  return null;
}

async function withStore<T>(fn: (store: SessionStore) => Promise<T>): Promise<T | null> {
  const primary = resolvePrimaryStore();
  if (!primary) return null;
  try {
    return await fn(primary);
  } catch {
    if (isProduction()) return null;
    return fn(memoryStore);
  }
}

export function isValidWifeDeviceId(raw: string | null | undefined): boolean {
  return normalizeDeviceId(raw).length > 0;
}

export function extractDeviceIdFromRequest(req: Request): string {
  const raw =
    req.headers.get('x-wife-device-id') ??
    req.headers.get('X-WIFE-Device-Id') ??
    '';
  return normalizeDeviceId(raw);
}

export async function registerTokenSessionServer(
  token: string,
  deviceId: string,
): Promise<boolean> {
  const fields = extractJwtSessionFields(token);
  if (!fields) return false;

  const record: TokenSessionRecord = {
    sub: fields.sub,
    jti: fields.jti,
    iat: fields.iat,
    deviceId: normalizeDeviceId(deviceId),
    expiresAt: fields.exp + SESSION_RETENTION_MS,
  };

  const result = await withStore(async (store) => {
    await store.upsertSession(record);
    return true;
  });
  return result ?? false;
}

export async function detectStolenTokenServer(
  token: string,
  deviceId: string,
): Promise<StolenTokenVerdict> {
  const fields = extractJwtSessionFields(token);
  if (!fields) return { status: 'valid', reason: 'cannot-decode' };

  const nowMs = Date.now();
  const normalizedDeviceId = normalizeDeviceId(deviceId);

  const storeResult = await withStore(async (store) => {
    await store.deleteExpired(nowMs);
    const activeRecords = await store.listActiveBySub(fields.sub, nowMs);

    if (activeRecords.length === 0) {
      return { status: 'valid' as const, reason: 'first-seen' };
    }

    const matchingRecord = activeRecords.find((r) => r.jti === fields.jti);
    if (matchingRecord) {
      if (
        normalizedDeviceId &&
        matchingRecord.deviceId &&
        matchingRecord.deviceId !== normalizedDeviceId
      ) {
        return {
          status: 'cloned' as const,
          reason: `Same jti (${fields.jti}) from different device`,
        };
      }
      return { status: 'valid' as const, reason: 'match' };
    }

    const latestRecord = activeRecords.reduce(
      (latest, r) => (r.iat > latest.iat ? r : latest),
      activeRecords[0],
    );
    if (fields.iat < latestRecord.iat - IAT_GRACE_PERIOD_MS) {
      return {
        status: 'stolen' as const,
        reason: `Older jti (${fields.jti}) than active session (${latestRecord.jti})`,
      };
    }

    return { status: 'valid' as const, reason: 'new-token-pending-register' };
  });

  if (!storeResult) {
    if (isProduction()) {
      return { status: 'stolen', reason: 'session-store-unavailable-fail-closed' };
    }
    return { status: 'valid', reason: 'store-unavailable' };
  }

  if (storeResult.status === 'valid' && storeResult.reason === 'new-token-pending-register') {
    await registerTokenSessionServer(token, normalizedDeviceId);
    return { status: 'valid', reason: 'new-token-registered' };
  }

  if (storeResult.status === 'valid' && storeResult.reason === 'first-seen') {
    await registerTokenSessionServer(token, normalizedDeviceId);
  }

  return storeResult;
}

export async function revokeTokenSessionsForSubject(subject: string): Promise<void> {
  const trimmed = subject.trim();
  if (!trimmed) return;
  const nowMs = Date.now();
  await withStore(async (store) => {
    await store.deleteActiveBySub(trimmed, nowMs);
    return true;
  });
}

/** Test-only: clears in-memory session fallback between isolated scenarios. */
export function resetStolenTokenServerForTests(): void {
  IN_MEMORY_SESSIONS.clear();
}
