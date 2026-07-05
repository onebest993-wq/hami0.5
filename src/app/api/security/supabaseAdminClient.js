import { createClient } from '@supabase/supabase-js';
export function getSupabaseAdminClient() {
    var _a, _b;
    var supabaseUrl = ((_a = process.env.SUPABASE_URL) !== null && _a !== void 0 ? _a : '').trim();
    var serviceRoleKey = ((_b = process.env.SUPABASE_SERVICE_ROLE_KEY) !== null && _b !== void 0 ? _b : '').trim();
    if (!supabaseUrl || !serviceRoleKey) {
        return null;
    }
    return createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}
