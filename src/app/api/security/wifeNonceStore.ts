/**
 * Distributed nonce store adapter for WIFE anti-replay protection.
 *
 * Priority:
 * 1) Redis (Upstash REST) when configured
 * 2) Supabase PostgREST table fallback
 * 3) Ephemeral in-memory fallback (development safety net)
 *
 * Notes:
 * - Redis path is atomic using SET NX PX.
 * - Supabase path expects a unique constraint on "nonce" column to enforce atomicity.
 */

import { supabasePrivilegedKeyEnvName } from './supabasePrivilegedEnv.ts';

const DEFAULT_NONCE_TABLE = 'wife_nonce_store';
const IN_MEMORY_NONCE_FALLBACK = new Map<string, number>();

type NonceStore = {
  consumeNonce(nonce: string, nowMs: number, ttlMs: number): Promise<boolean>;
};

function getEnv(name: string): string {
  const raw = process.env[name];
  return typeof raw === 'string' ? raw.trim() : '';
}

function isProduction(): boolean {
  return getEnv('NODE_ENV').toLowerCase() === 'production';
}

function buildNonceKey(nonce: string): string {
  return `wife:nonce:${nonce}`;
}

function pruneInMemory(nowMs: number): void {
  for (const [nonce, expiresAt] of IN_MEMORY_NONCE_FALLBACK.entries()) {
    if (expiresAt <= nowMs) IN_MEMORY_NONCE_FALLBACK.delete(nonce);
  }
}

const memoryStore: NonceStore = {
  async consumeNonce(nonce: string, nowMs: number, ttlMs: number): Promise<boolean> {
    pruneInMemory(nowMs);
    if (IN_MEMORY_NONCE_FALLBACK.has(nonce)) return false;
    IN_MEMORY_NONCE_FALLBACK.set(nonce, nowMs + ttlMs);
    return true;
  },
};

function hasRedisConfig(): boolean {
  return Boolean(getEnv('WIFE_REDIS_REST_URL') && getEnv('WIFE_REDIS_REST_TOKEN'));
}

const redisStore: NonceStore = {
  async consumeNonce(nonce: string, _nowMs: number, ttlMs: number): Promise<boolean> {
    const redisUrl = getEnv('WIFE_REDIS_REST_URL');
    const redisToken = getEnv('WIFE_REDIS_REST_TOKEN');
    if (!redisUrl || !redisToken) throw new Error('Redis nonce store is not configured.');

    const key = encodeURIComponent(buildNonceKey(nonce));
    const endpoint = `${redisUrl.replace(/\/+$/, '')}/set/${key}/1?NX=true&PX=${ttlMs}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Redis nonce store failed: ${response.status}`);
    }

    const result = (await response.json().catch(() => null)) as { result?: unknown } | null;
    // Upstash returns { result: "OK" } when SET NX succeeds.
    return result?.result === 'OK';
  },
};

function hasSupabaseConfig(): boolean {
  return Boolean(getEnv('SUPABASE_URL') && (getEnv(supabasePrivilegedKeyEnvName()) || getEnv('SUPABASE_ANON_KEY')));
}

const supabaseStore: NonceStore = {
  async consumeNonce(nonce: string, nowMs: number, ttlMs: number): Promise<boolean> {
    const supabaseUrl = getEnv('SUPABASE_URL');
    const supabaseKey = getEnv(supabasePrivilegedKeyEnvName()) || getEnv('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase nonce store is not configured.');

    const table = getEnv('WIFE_NONCE_TABLE') || DEFAULT_NONCE_TABLE;
    const baseUrl = supabaseUrl.replace(/\/+$/, '');
    const restTableUrl = `${baseUrl}/rest/v1/${encodeURIComponent(table)}`;

    // Best-effort cleanup for expired rows.
    void fetch(`${restTableUrl}?expires_at_ms=lt.${nowMs}`, {
      method: 'DELETE',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    }).catch(() => undefined);

    const expiresAt = nowMs + ttlMs;
    const response = await fetch(restTableUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: 'resolution=ignore-duplicates,return=representation',
      },
      body: JSON.stringify([{ nonce, expires_at_ms: expiresAt }]),
    });

    if (!response.ok) {
      throw new Error(`Supabase nonce store failed: ${response.status}`);
    }

    const rows = (await response.json().catch(() => [])) as Array<{ nonce?: unknown }>;
    // Insert succeeded only when row is returned; empty means duplicate nonce.
    return Array.isArray(rows) && rows.length > 0;
  },
};

function resolvePrimaryStore(): NonceStore | null {
  if (hasRedisConfig()) return redisStore;
  if (hasSupabaseConfig()) return supabaseStore;
  if (!isProduction()) return memoryStore;
  return null;
}

/**
 * Returns true only when nonce is new and successfully persisted for TTL window.
 * Returns false for replay attempts.
 */
export async function consumeNonceWithTtl(nonce: string, ttlMs: number): Promise<boolean> {
  const nowMs = Date.now();
  const primary = resolvePrimaryStore();

  if (!primary) {
    if (isProduction()) return false;
    return await memoryStore.consumeNonce(nonce, nowMs, ttlMs);
  }

  try {
    return await primary.consumeNonce(nonce, nowMs, ttlMs);
  } catch {
    if (isProduction()) return false;
    return await memoryStore.consumeNonce(nonce, nowMs, ttlMs);
  }
}

/** Test-only: clears in-memory nonce fallback between isolated scenarios. */
export function resetNonceStoreForTests(): void {
  IN_MEMORY_NONCE_FALLBACK.clear();
}
