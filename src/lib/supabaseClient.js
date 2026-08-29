import { createClient } from '@supabase/supabase-js';
import { scrubBrokenAuthHashFromAddress } from '@/app/services/auth/scrubBrokenAuthHash';
import { resolveClientSupabaseConfig } from '@/utils/supabase/clientEnv';

/**
 * عميل كسول — لا يستدعِ resolveClientSupabaseConfig عند تقييم الوحدة.
 * التقييم المتزامن أثناء دورة boot-runtime ↔ home-paint ↔ command-hub كان يضرب
 * Temporal Dead Zone على كاش clientEnv (Cannot access 'q' before initialization)
 * ويؤخّر الإقلاع بإنشاء العميل قبل أول حاجة حقيقية.
 */
let _client = null;

function getSupabaseClient() {
    if (_client) return _client;
    scrubBrokenAuthHashFromAddress();
    const { url: supabaseUrl, anonKey: supabaseAnonKey } = resolveClientSupabaseConfig();
    const isTestMode = import.meta.env.MODE === 'test';
    const isBffAuth = import.meta.env.VITE_BFF_AUTH === 'true';
    _client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: !isBffAuth && !isTestMode,
            autoRefreshToken: !isBffAuth && !isTestMode,
            detectSessionInUrl: !isTestMode,
        },
    });
    return _client;
}

export const supabase = new Proxy(
    {},
    {
        get(_target, prop) {
            const client = getSupabaseClient();
            const value = client[prop];
            return typeof value === 'function' ? value.bind(client) : value;
        },
        has(_target, prop) {
            return prop in getSupabaseClient();
        },
        ownKeys() {
            return Reflect.ownKeys(getSupabaseClient());
        },
        getOwnPropertyDescriptor(_target, prop) {
            return Reflect.getOwnPropertyDescriptor(getSupabaseClient(), prop);
        },
    },
);

/** اختبارات — إعادة ضبط العميل الكسول */
export function __resetSupabaseClientForTests() {
    _client = null;
}
