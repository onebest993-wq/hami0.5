import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readSupabasePrivilegedKey } from './supabasePrivilegedEnv.ts';

export function getSupabaseAdminClient(): SupabaseClient | null {
  const supabaseUrl = (process.env.SUPABASE_URL ?? '').trim();
  const serviceRoleKey = readSupabasePrivilegedKey();
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
