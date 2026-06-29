import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

function readServerEnv(key: string): string {
    if (typeof process === 'undefined' || !process.env) return '';
    return String(process.env[key] ?? '').trim();
}

/** Service-role Supabase — server/API only; never in browser bundles. */
export function getForumSupabaseAdmin(): SupabaseClient | null {
    if (typeof window !== 'undefined') return null;
    if (adminClient) return adminClient;
    const supabaseUrl = readServerEnv('SUPABASE_URL');
    const serviceRoleKey = readServerEnv('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) return null;
    adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    return adminClient;
}

export function isForumSupabaseConfigured(): boolean {
    if (typeof window !== 'undefined') return false;
    return Boolean(readServerEnv('SUPABASE_URL') && readServerEnv('SUPABASE_SERVICE_ROLE_KEY'));
}
