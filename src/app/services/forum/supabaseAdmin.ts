import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

export function getForumSupabaseAdmin(): SupabaseClient | null {
    if (adminClient) return adminClient;
    const supabaseUrl = (process.env.SUPABASE_URL ?? '').trim();
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
    if (!supabaseUrl || !serviceRoleKey) return null;
    adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    return adminClient;
}

export function isForumSupabaseConfigured(): boolean {
    return Boolean((process.env.SUPABASE_URL ?? '').trim() && (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim());
}
