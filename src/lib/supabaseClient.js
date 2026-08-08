import { createClient } from '@supabase/supabase-js';
import { resolveClientSupabaseConfig } from '@/utils/supabase/clientEnv';

const { url: supabaseUrl, anonKey: supabaseAnonKey } = resolveClientSupabaseConfig();
const isTestMode = import.meta.env.MODE === 'test';
const isBffAuth = import.meta.env.VITE_BFF_AUTH === 'true';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: !isBffAuth && !isTestMode,
        autoRefreshToken: !isBffAuth && !isTestMode,
        detectSessionInUrl: !isTestMode,
    },
});
