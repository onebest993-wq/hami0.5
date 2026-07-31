import { getSupabaseAdminClient } from '@/app/api/security/supabaseAdminClient';
import { wifeJsonResponse } from '@/app/api/security/wifeSecurityHeaders';

export const runtime = 'nodejs';

function getEnv(name: string): string {
  const raw = process.env[name];
  return typeof raw === 'string' ? raw.trim() : '';
}

function hasRedisConfig(): boolean {
  return Boolean(getEnv('WIFE_REDIS_REST_URL') && getEnv('WIFE_REDIS_REST_TOKEN'));
}

async function checkSupabase(timeoutMs = 1500): Promise<{ ok: boolean; error?: string }> {
  const admin = getSupabaseAdminClient();
  if (!admin) return { ok: false, error: 'supabase_not_configured' };

  try {
    const result = await Promise.race([
      admin.from('kv_store_f09713ba').select('key').limit(1),
      new Promise<{ data: null; error: { message: string } }>((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), timeoutMs);
      }),
    ]);
    if (!result || typeof result !== 'object') return { ok: false, error: 'invalid_result' };
    const { error } = result as { error: { message?: unknown } | null };
    if (error) return { ok: false, error: 'supabase_query_failed' };
    return { ok: true };
  } catch {
    return { ok: false, error: 'supabase_timeout' };
  }
}

export async function GET(): Promise<Response> {
  const redisConfigured = hasRedisConfig();
  const supabase = await checkSupabase();
  const ready = Boolean(supabase.ok);

  return wifeJsonResponse(ready ? 200 : 503, {
    ok: ready,
    ts: Date.now(),
    checks: {
      supabase,
      redisConfigured,
    },
  });
}

