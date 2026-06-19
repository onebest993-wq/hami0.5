/**
 * Server-side CSRF token registry (Redis → Supabase → memory).
 * Binds CSRF token to authenticated subject (sub).
 */

const DEFAULT_CSRF_TABLE = 'wife_csrf_store';
const CSRF_TTL_MS = 24 * 60 * 60 * 1000;
const memoryStore = new Map<string, { token: string; expiresAtMs: number }>();

function getEnv(name: string): string {
  const raw = process.env[name];
  return typeof raw === 'string' ? raw.trim() : '';
}

function isProduction(): boolean {
  return getEnv('NODE_ENV').toLowerCase() === 'production';
}

function hasRedisConfig(): boolean {
  return Boolean(getEnv('WIFE_REDIS_REST_URL') && getEnv('WIFE_REDIS_REST_TOKEN'));
}

function redisKey(sub: string): string {
  return encodeURIComponent(`wife:csrf:${sub}`);
}

function pruneMemory(nowMs: number): void {
  for (const [sub, row] of memoryStore.entries()) {
    if (row.expiresAtMs <= nowMs) memoryStore.delete(sub);
  }
}

function getSupabaseAdminClient(): ReturnType<typeof import('@supabase/supabase-js').createClient> | null {
  const supabaseUrl = getEnv('SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return null;
  const { createClient } = require('@supabase/supabase-js') as typeof import('@supabase/supabase-js');
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function persistToken(sub: string, token: string, expiresAtMs: number): Promise<boolean> {
  if (hasRedisConfig()) {
    try {
      const redisUrl = getEnv('WIFE_REDIS_REST_URL');
      const redisToken = getEnv('WIFE_REDIS_REST_TOKEN');
      const ttlMs = Math.max(60_000, expiresAtMs - Date.now());
      const endpoint = `${redisUrl.replace(/\/+$/, '')}/set/${redisKey(sub)}/${encodeURIComponent(token)}?PX=${ttlMs}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${redisToken}` },
      });
      if (res.ok) return true;
    } catch {
      if (isProduction()) return false;
    }
  }

  const admin = getSupabaseAdminClient();
  if (admin) {
    try {
      const table = getEnv('WIFE_CSRF_TABLE') || DEFAULT_CSRF_TABLE;
      const { error } = await admin.from(table).upsert(
        { sub, token, expires_at_ms: expiresAtMs },
        { onConflict: 'sub' },
      );
      if (!error) return true;
    } catch {
      if (isProduction()) return false;
    }
  }

  if (isProduction()) return false;
  memoryStore.set(sub, { token, expiresAtMs });
  return true;
}

async function readToken(sub: string): Promise<string | null> {
  const nowMs = Date.now();
  pruneMemory(nowMs);

  if (hasRedisConfig()) {
    try {
      const redisUrl = getEnv('WIFE_REDIS_REST_URL');
      const redisToken = getEnv('WIFE_REDIS_REST_TOKEN');
      const endpoint = `${redisUrl.replace(/\/+$/, '')}/get/${redisKey(sub)}`;
      const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${redisToken}` } });
      if (res.ok) {
        const body = (await res.json().catch(() => null)) as { result?: unknown } | null;
        if (typeof body?.result === 'string' && body.result) return body.result;
      }
    } catch {
      if (isProduction()) return null;
    }
  }

  const admin = getSupabaseAdminClient();
  if (admin) {
    try {
      const table = getEnv('WIFE_CSRF_TABLE') || DEFAULT_CSRF_TABLE;
      const { data, error } = await admin
        .from(table)
        .select('token, expires_at_ms')
        .eq('sub', sub)
        .maybeSingle();
      if (!error && data && Number(data.expires_at_ms) > nowMs) {
        return String(data.token ?? '');
      }
    } catch {
      if (isProduction()) return null;
    }
  }

  const cached = memoryStore.get(sub);
  if (cached && cached.expiresAtMs > nowMs) return cached.token;
  return null;
}

export function generateCsrfTokenValue(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function issueCsrfTokenForSubject(sub: string): Promise<string | null> {
  if (!sub) return null;
  const token = generateCsrfTokenValue();
  const expiresAtMs = Date.now() + CSRF_TTL_MS;
  const ok = await persistToken(sub, token, expiresAtMs);
  return ok ? token : null;
}

export async function invalidateCsrfForSubject(sub: string): Promise<void> {
  if (!sub) return;
  memoryStore.delete(sub);

  if (hasRedisConfig()) {
    try {
      const redisUrl = getEnv('WIFE_REDIS_REST_URL');
      const redisToken = getEnv('WIFE_REDIS_REST_TOKEN');
      const endpoint = `${redisUrl.replace(/\/+$/, '')}/del/${redisKey(sub)}`;
      await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${redisToken}` },
      });
    } catch {
      /* best effort */
    }
  }

  const admin = getSupabaseAdminClient();
  if (admin) {
    try {
      const table = getEnv('WIFE_CSRF_TABLE') || DEFAULT_CSRF_TABLE;
      await admin.from(table).delete().eq('sub', sub);
    } catch {
      /* best effort */
    }
  }
}

export async function validateCsrfForSubject(sub: string, token: string): Promise<boolean> {
  if (!sub || !token) return false;
  const expected = await readToken(sub);
  if (!expected) return false;
  return timingSafeEqual(expected, token);
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  const maxLen = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < maxLen; i++) {
    diff |= (i < aBytes.length ? aBytes[i] : 0) ^ (i < bBytes.length ? bBytes[i] : 0);
  }
  return diff === 0;
}

export function resetCsrfServerStoreForTests(): void {
  memoryStore.clear();
}
