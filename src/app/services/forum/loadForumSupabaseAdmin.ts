/**
 * تحميل عميل منتدى Supabase المميّز — خادم فقط (@vite-ignore).
 * لا يستورد العميل supabaseAdmin / privileged env بشكل ثابت.
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
    const spec = '@/app/services/forum/supabaseAdmin.ts';
    const mod = await import(/* @vite-ignore */ spec);
    return mod.getForumSupabaseAdmin() as ForumSupabaseAdmin | null;
  } catch {
    return null;
  }
}
