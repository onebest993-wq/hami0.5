import { getSupabaseAdminClient } from './supabaseAdminClient.ts';
import { supabasePrivilegedKeyEnvName } from './supabasePrivilegedEnv.ts';
import { wifeRedisJson } from './wifeRedisRest.ts';
import { getWifeEnv, hasWifeRedisConfig, isWifeProduction } from './wifeStoreEnv.ts';

const DEFAULT_SESSION_TABLE = 'wife_token_sessions';

export type TokenSessionRecord = {
  sub: string;
  /** `session_id` من توكن Supabase — يُخزَّن في عمود اسمه `jti` تاريخياً */
  sessionId: string;
  iat: number;
  deviceId: string;
  expiresAt: number;
};

export type StolenTokenSessionStore = {
  listActiveBySub(sub: string, nowMs: number): Promise<TokenSessionRecord[]>;
  upsertSession(record: TokenSessionRecord): Promise<void>;
  deleteExpired(nowMs: number): Promise<void>;
  deleteActiveBySub(sub: string, nowMs: number): Promise<void>;
};

const IN_MEMORY_SESSIONS = new Map<string, TokenSessionRecord>();

function sessionKey(sub: string, sessionId: string): string {
  return `${sub}:${sessionId}`;
}

function pruneInMemory(nowMs: number): void {
  for (const [key, record] of IN_MEMORY_SESSIONS.entries()) {
    if (record.expiresAt <= nowMs) IN_MEMORY_SESSIONS.delete(key);
  }
}

const memoryStore: StolenTokenSessionStore = {
  async listActiveBySub(sub: string, nowMs: number): Promise<TokenSessionRecord[]> {
    pruneInMemory(nowMs);
    return [...IN_MEMORY_SESSIONS.values()].filter((r) => r.sub === sub && r.expiresAt > nowMs);
  },
  async upsertSession(record: TokenSessionRecord): Promise<void> {
    IN_MEMORY_SESSIONS.set(sessionKey(record.sub, record.sessionId), record);
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

function redisSessionKey(sub: string, sessionId: string): string {
  return encodeURIComponent(`wife:toksess:${sub}:${sessionId}`);
}

async function redisScanTokenSessionKeys(sub: string): Promise<string[]> {
  const prefix = encodeURIComponent(`wife:toksess:${sub}:`);
  const scan = await wifeRedisJson(`/keys/${prefix}*`);
  if (!scan.ok) throw new Error(`Redis session scan failed: ${scan.status}`);
  return Array.isArray(scan.result) ? scan.result.filter((k): k is string => typeof k === 'string') : [];
}

async function redisReadTokenSession(key: string): Promise<TokenSessionRecord | null> {
  const get = await wifeRedisJson(`/get/${encodeURIComponent(key)}`);
  if (!get.ok || typeof get.result !== 'string' || !get.result) return null;
  try {
    return JSON.parse(get.result) as TokenSessionRecord;
  } catch {
    return null;
  }
}

const redisStore: StolenTokenSessionStore = {
  async listActiveBySub(sub: string, nowMs: number): Promise<TokenSessionRecord[]> {
    const keys = await redisScanTokenSessionKeys(sub);
    const records: TokenSessionRecord[] = [];
    for (const key of keys) {
      const parsed = await redisReadTokenSession(key);
      if (parsed && parsed.sub === sub && parsed.expiresAt > nowMs) records.push(parsed);
    }
    return records;
  },
  async upsertSession(record: TokenSessionRecord): Promise<void> {
    const ttlMs = Math.max(60_000, record.expiresAt - Date.now());
    const key = redisSessionKey(record.sub, record.sessionId);
    const response = await wifeRedisJson(
      `/set/${key}/${encodeURIComponent(JSON.stringify(record))}?PX=${ttlMs}`,
      'POST',
    );
    if (!response.ok) throw new Error(`Redis session set failed: ${response.status}`);
  },
  async deleteExpired(_nowMs: number): Promise<void> {
    /* Redis TTL handles expiry */
  },
  async deleteActiveBySub(sub: string, nowMs: number): Promise<void> {
    const keys = await redisScanTokenSessionKeys(sub);
    for (const key of keys) {
      const parsed = await redisReadTokenSession(key);
      if (!parsed || parsed.sub !== sub || parsed.expiresAt <= nowMs) continue;
      await wifeRedisJson(`/del/${encodeURIComponent(key)}`, 'POST');
    }
  },
};

function hasSupabaseConfig(): boolean {
  return Boolean(getWifeEnv('SUPABASE_URL') && getWifeEnv(supabasePrivilegedKeyEnvName()));
}

const supabaseStore: StolenTokenSessionStore = {
  async listActiveBySub(sub: string, nowMs: number): Promise<TokenSessionRecord[]> {
    const admin = getSupabaseAdminClient();
    if (!admin) throw new Error('Supabase session store is not configured.');
    const table = getWifeEnv('WIFE_TOKEN_SESSION_TABLE') || DEFAULT_SESSION_TABLE;

    void admin.from(table).delete().lt('expires_at_ms', nowMs);

    const { data, error } = await admin
      .from(table)
      .select('sub,jti,iat_ms,device_id,expires_at_ms')
      .eq('sub', sub)
      .gt('expires_at_ms', nowMs);
    if (error) throw new Error(`Supabase session list failed: ${error.message}`);

    return (data ?? []).map((row: Record<string, unknown>) => ({
      sub: String(row.sub ?? ''),
      sessionId: String(row.jti ?? ''),
      iat: Number(row.iat_ms ?? 0),
      deviceId: String(row.device_id ?? ''),
      expiresAt: Number(row.expires_at_ms ?? 0),
    }));
  },
  async upsertSession(record: TokenSessionRecord): Promise<void> {
    const admin = getSupabaseAdminClient();
    if (!admin) throw new Error('Supabase session store is not configured.');
    const table = getWifeEnv('WIFE_TOKEN_SESSION_TABLE') || DEFAULT_SESSION_TABLE;

    const { error } = await admin.from(table).upsert(
      {
        sub: record.sub,
        jti: record.sessionId,
        iat_ms: record.iat,
        device_id: record.deviceId,
        expires_at_ms: record.expiresAt,
      },
      { onConflict: 'sub,jti' },
    );
    if (error) throw new Error(`Supabase session upsert failed: ${error.message}`);
  },
  async deleteExpired(nowMs: number): Promise<void> {
    const admin = getSupabaseAdminClient();
    if (!admin) return;
    const table = getWifeEnv('WIFE_TOKEN_SESSION_TABLE') || DEFAULT_SESSION_TABLE;
    void admin.from(table).delete().lt('expires_at_ms', nowMs);
  },
  async deleteActiveBySub(sub: string, nowMs: number): Promise<void> {
    const admin = getSupabaseAdminClient();
    if (!admin) throw new Error('Supabase session store is not configured.');
    const table = getWifeEnv('WIFE_TOKEN_SESSION_TABLE') || DEFAULT_SESSION_TABLE;
    const { error } = await admin.from(table).delete().eq('sub', sub).gt('expires_at_ms', nowMs);
    if (error) throw new Error(`Supabase session revoke failed: ${error.message}`);
  },
};

function resolvePrimaryStore(): StolenTokenSessionStore | null {
  if (hasWifeRedisConfig()) return redisStore;
  if (hasSupabaseConfig()) return supabaseStore;
  if (!isWifeProduction()) return memoryStore;
  return null;
}

export async function withStolenTokenStore<T>(
  fn: (store: StolenTokenSessionStore) => Promise<T>,
): Promise<T | null> {
  const primary = resolvePrimaryStore();
  if (!primary) return null;
  try {
    return await fn(primary);
  } catch {
    if (isWifeProduction()) return null;
    return fn(memoryStore);
  }
}

export function resetStolenTokenMemoryForTests(): void {
  IN_MEMORY_SESSIONS.clear();
}
