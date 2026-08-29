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
import { wifeRedisJson } from './wifeRedisRest.ts';
import { getWifeEnv, hasWifeRedisConfig, isWifeProduction } from './wifeStoreEnv.ts';

const DEFAULT_NONCE_TABLE = 'wife_nonce_store';
const IN_MEMORY_NONCE_FALLBACK = new Map<string, number>();

type NonceStore = {
  consumeNonce(nonce: string, nowMs: number, ttlMs: number): Promise<boolean>;
};

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

const redisStore: NonceStore = {
  async consumeNonce(nonce: string, _nowMs: number, ttlMs: number): Promise<boolean> {
    const key = encodeURIComponent(buildNonceKey(nonce));
    const response = await wifeRedisJson(`/set/${key}/1?NX=true&PX=${ttlMs}`, 'POST');
    if (!response.ok) {
      throw new Error(`Redis nonce store failed: ${response.status}`);
    }
    // Upstash returns { result: "OK" } when SET NX succeeds.
    return response.result === 'OK';
  },
};

function hasSupabaseConfig(): boolean {
  return Boolean(getWifeEnv('SUPABASE_URL') && (getWifeEnv(supabasePrivilegedKeyEnvName()) || getWifeEnv('SUPABASE_ANON_KEY')));
}

const supabaseStore: NonceStore = {
  async consumeNonce(nonce: string, nowMs: number, ttlMs: number): Promise<boolean> {
    const supabaseUrl = getWifeEnv('SUPABASE_URL');
    const supabaseKey = getWifeEnv(supabasePrivilegedKeyEnvName()) || getWifeEnv('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase nonce store is not configured.');

    const table = getWifeEnv('WIFE_NONCE_TABLE') || DEFAULT_NONCE_TABLE;
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
  if (hasWifeRedisConfig()) return redisStore;
  if (hasSupabaseConfig()) return supabaseStore;
  if (!isWifeProduction()) return memoryStore;
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
    if (isWifeProduction()) return false;
    return await memoryStore.consumeNonce(nonce, nowMs, ttlMs);
  }

  try {
    return await primary.consumeNonce(nonce, nowMs, ttlMs);
  } catch {
    if (isWifeProduction()) return false;
    return await memoryStore.consumeNonce(nonce, nowMs, ttlMs);
  }
}

/** Test-only: clears in-memory nonce fallback between isolated scenarios. */
export function resetNonceStoreForTests(): void {
  IN_MEMORY_NONCE_FALLBACK.clear();
}
