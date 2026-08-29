import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readSupabasePrivilegedKey } from './supabasePrivilegedEnv.ts';

/*
 * عميل واحد لكل بيئة بدل واحد لكل نداء.
 *
 * `createClient` ليس مؤشّراً خفيفاً: يبني PostgREST وGoTrue وRealtime وStorage
 * وFunctions في كل استدعاء. مسار `/api/kv-proxy` كان يبنيها ستّ مرّات في الطلب
 * الواحد — مرّة لكل عملية مفتاح/قيمة — وهو المسار الذي تمرّ منه الملفّات
 * الشخصية والتقويم والمستودع. الذاكرة مربوطة بالعنوان والمفتاح معاً فلا يبقى
 * عميل قديم حيّاً بعد تدوير المفتاح.
 */
let cachedClient: SupabaseClient | null = null;
let cachedFingerprint = '';

/** GoTrue Admin API — عميل الخدمة لا يُصدِّر `auth.admin` في أنواع supabase-js المستخدمة هنا. */
export type GoTrueAdminApi = {
    getUserById: (id: string) => Promise<{
        data?: {
            user?: {
                id?: string;
                email?: string | null;
                user_metadata?: unknown;
                app_metadata?: unknown;
                created_at?: string | null;
                last_sign_in_at?: string | null;
                email_confirmed_at?: string | null;
                banned_until?: string | null;
                phone?: string | null;
            } | null;
        };
        error?: { message?: string } | null;
    }>;
    updateUserById: (
        id: string,
        attrs: {
            password?: string;
            user_metadata?: Record<string, unknown>;
            app_metadata?: Record<string, unknown>;
            email_confirm?: boolean;
            ban_duration?: string;
        },
    ) => Promise<{ error?: { message?: string } | null }>;
    signOut?: (
        id: string,
        scope?: 'global' | 'others' | 'local',
    ) => Promise<{ error?: { message?: string } | null }>;
    deleteUser: (id: string) => Promise<{ error?: { message?: string } | null }>;
    listUsers: (args: { page?: number; perPage?: number }) => Promise<{
        data?: { users?: Array<{ id?: string; email?: string | null; user_metadata?: unknown }> };
        error?: { message?: string } | null;
    }>;
};

export function getGoTrueAdminApi(client: SupabaseClient): GoTrueAdminApi {
    return (client.auth as unknown as { admin: GoTrueAdminApi }).admin;
}

export function getSupabaseAdminClient(): SupabaseClient | null {
    const supabaseUrl = (process.env.SUPABASE_URL ?? '').trim();
    const serviceRoleKey = readSupabasePrivilegedKey();
    if (!supabaseUrl || !serviceRoleKey) {
        cachedClient = null;
        cachedFingerprint = '';
        return null;
    }

    const fingerprint = `${supabaseUrl}\u0000${serviceRoleKey}`;
    if (cachedClient && cachedFingerprint === fingerprint) return cachedClient;

    cachedClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    cachedFingerprint = fingerprint;
    return cachedClient;
}

/** الاختبارات تبدّل متغيّرات البيئة بين الحالات — بلا هذا تحمل الذاكرة عميل الحالة السابقة */
export function __resetSupabaseAdminClientForTests(): void {
    cachedClient = null;
    cachedFingerprint = '';
}
