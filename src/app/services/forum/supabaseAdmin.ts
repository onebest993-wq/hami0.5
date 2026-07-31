import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readSupabasePrivilegedKey } from '@/app/api/security/supabasePrivilegedEnv';

let adminClient: SupabaseClient | null = null;

function readServerEnv(key: string): string {
    if (typeof process === 'undefined' || !process.env) return '';
    return String(process.env[key] ?? '').trim();
}

/** Privileged Supabase client — server/API only; never rely on browser for secrets. */
export function getForumSupabaseAdmin(): SupabaseClient | null {
    if (typeof window !== 'undefined') return null;
    if (adminClient) return adminClient;
    const supabaseUrl = readServerEnv('SUPABASE_URL');
    const serviceRoleKey = readSupabasePrivilegedKey();
    if (!supabaseUrl || !serviceRoleKey) return null;
    adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    return adminClient;
}

export function isForumSupabaseConfigured(): boolean {
    if (typeof window !== 'undefined') return false;
    return Boolean(readServerEnv('SUPABASE_URL') && readSupabasePrivilegedKey());
}
