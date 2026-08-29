/**
 * تحميل عميل منتدى Supabase المميّز — خادم فقط.
 * مسار Vite قابل للتحليل (بدون تعليق تجاهل على مسار نسبي غامض كان يعلّق الطلب).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type ForumSupabaseAdmin = SupabaseClient;

/** سياسة تهيئة خفيفة بلا createClient — على المتصفح دائماً false */
export function isForumSupabaseConfigured(): boolean {
  if (typeof window !== 'undefined') return false;
  if (typeof process === 'undefined' || !process.env) return false;
  return Boolean(String(process.env.SUPABASE_URL ?? '').trim());
}

export async function loadForumSupabaseAdmin(): Promise<ForumSupabaseAdmin | null> {
  if (typeof window !== 'undefined') return null;
  try {
    const mod = await import('@/app/api/security/supabaseAdminClient.ts');
    return mod.getSupabaseAdminClient();
  } catch {
    return null;
  }
}
