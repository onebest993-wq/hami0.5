import { createClient } from '@supabase/supabase-js';
import { readSupabasePrivilegedKey } from './supabasePrivilegedEnv.js';
export function getSupabaseAdminClient() {
    var _a;
    var supabaseUrl = ((_a = process.env.SUPABASE_URL) !== null && _a !== void 0 ? _a : '').trim();
    var serviceRoleKey = readSupabasePrivilegedKey();
    if (!supabaseUrl || !serviceRoleKey) {
        return null;
    }
    return createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}
