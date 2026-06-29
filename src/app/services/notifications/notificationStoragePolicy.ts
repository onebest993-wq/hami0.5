import { isForumSupabaseConfigured } from '@/app/services/forum/supabaseAdmin';

function readServerEnv(key: string): string {
    if (typeof process === 'undefined' || !process.env) return '';
    return String(process.env[key] ?? '').trim();
}

/** Supabase inbox — مفعّل افتراضياً عند service role؛ عطّله بـ SHELL_NOTIFICATIONS_SUPABASE=false */
export function isShellNotificationSupabaseEnabled(): boolean {
    if (typeof window !== 'undefined') return false;
    if (readServerEnv('SHELL_NOTIFICATIONS_SUPABASE') === 'false') return false;
    return isForumSupabaseConfigured();
}

/**
 * KV blob cache — افتراضياً OFF عند تفعيل Supabase (لا dual-write).
 * فعّله مؤقتاً أثناء migration: SHELL_NOTIFICATIONS_KV_CACHE=true
 */
export function isShellNotificationKvCacheEnabled(): boolean {
    if (!isShellNotificationSupabaseEnabled()) return true;
    return readServerEnv('SHELL_NOTIFICATIONS_KV_CACHE') === 'true';
}

/** بعد backfill من KV → حذف blob (مرة واحدة). SHELL_NOTIFICATIONS_PURGE_KV_AFTER_BACKFILL=true */
export function shouldPurgeKvBlobAfterBackfill(): boolean {
    return readServerEnv('SHELL_NOTIFICATIONS_PURGE_KV_AFTER_BACKFILL') === 'true';
}

/** مصدر الحقيقة على الخادم — Supabase إن وُجد، وإلا KV. */
export function shellNotificationPrimaryStore(): 'supabase' | 'kv' {
    return isShellNotificationSupabaseEnabled() ? 'supabase' : 'kv';
}
