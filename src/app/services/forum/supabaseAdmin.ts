import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from '@/app/api/security/supabaseAdminClient';

/**
 * عميل منتدى مميّز — خادم فقط. يُحمَّل ديناميكياً عبر loadForumSupabaseAdmin.
 */
export function getForumSupabaseAdmin(): SupabaseClient | null {
    if (typeof window !== 'undefined') return null;
    return getSupabaseAdminClient();
}
