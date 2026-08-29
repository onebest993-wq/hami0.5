/**
 * مصدر واحد لهوية عميل Supabase في المتصفّح.
 *
 * الإنتاج: لا سقوط صامت على info.ts — غياب أو placeholder = فشل صريح.
 * التطوير/الاختبار: `devFallbackConfig` (vitest يحاكي info.ts).
 *
 * استيراد الاحتياطي يُستخدم فقط داخل فرع `PROD !== true || MODE === 'test'`
 * حتى تسقطه شجرة الإنتاج (define + DCE) ولا تُشحَن قيم المشروع المودَع.
 */

import { getDevFallbackSupabaseConfig } from '@/utils/supabase/devFallbackConfig';

export type ClientSupabaseConfig = {
    url: string;
    anonKey: string;
    projectId: string;
};

const PLACEHOLDER_RE = /YOUR_PROJECT|eyJ\.\.\.|CHANGE_ME|placeholder|xxxx|^xyzabc$/i;

function readEnv(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string {
    const raw =
        name === 'VITE_SUPABASE_URL'
            ? import.meta.env.VITE_SUPABASE_URL
            : import.meta.env.VITE_SUPABASE_ANON_KEY;
    return typeof raw === 'string' ? raw.trim() : '';
}

export function extractSupabaseProjectId(url: string): string | null {
    const m = url.match(/^https:\/\/([a-z0-9][a-z0-9-]*)\.supabase\.co\/?$/i);
    const projectId = m?.[1] ?? null;
    if (!projectId || PLACEHOLDER_RE.test(projectId)) return null;
    return projectId;
}

export function isClientEnvPlaceholder(value: string): boolean {
    return !value || PLACEHOLDER_RE.test(value);
}

let cached: ClientSupabaseConfig | null = null;
let cachedError: Error | null = null;

export function resolveClientSupabaseConfig(): ClientSupabaseConfig {
    if (cached) return cached;
    if (cachedError) throw cachedError;

    try {
        cached = resolveOnce();
        return cached;
    } catch (e) {
        cachedError = e instanceof Error ? e : new Error(String(e));
        throw cachedError;
    }
}

function resolveOnce(): ClientSupabaseConfig {
    const envUrl = readEnv('VITE_SUPABASE_URL');
    const envKey = readEnv('VITE_SUPABASE_ANON_KEY');
    const envReady =
        !isClientEnvPlaceholder(envUrl) &&
        !isClientEnvPlaceholder(envKey) &&
        envKey.length > 20;

    if (envReady) {
        const projectId = extractSupabaseProjectId(envUrl);
        if (!projectId) {
            throw new Error(
                `[clientEnv] VITE_SUPABASE_URL is not a recognizable Supabase URL: ${envUrl}`,
            );
        }
        return { url: envUrl.replace(/\/$/, ''), anonKey: envKey, projectId };
    }

    if (import.meta.env.PROD !== true || import.meta.env.MODE === 'test') {
        return getDevFallbackSupabaseConfig();
    }

    const missing: string[] = [];
    if (isClientEnvPlaceholder(envUrl)) missing.push('VITE_SUPABASE_URL');
    if (isClientEnvPlaceholder(envKey)) missing.push('VITE_SUPABASE_ANON_KEY');
    throw new Error(
        `[clientEnv] Production build refused to start — missing or placeholder: ${missing.join(', ')}. ` +
            'Set real values at build time; silent fallback to the committed info.ts project is forbidden.',
    );
}

export function assertClientEnvOrThrow(): void {
    resolveClientSupabaseConfig();
}

/**
 * رابط دالة حافة، مبنيّاً على الأصل المُحلَّل لا على معرِّف مشروع مثبَّت.
 *
 * كانت ثلاث وحدات تبني الرابط من `info.ts` مباشرةً، فتخاطب مشروع التطوير في
 * الإنتاج مهما ضُبطت متغيّرات البيئة — والمفتاح المودَع يُشحن مع كل حزمة. هنا
 * يرث كل نداء العقد نفسه: قيمة حقيقية أو فشل صريح.
 */
export function supabaseFunctionUrl(functionPath: string): string {
    const { url } = resolveClientSupabaseConfig();
    return `${url}/functions/v1/${functionPath.replace(/^\/+/, '')}`;
}

/** مفتاح anon المُحلَّل — بديل استيراد `publicAnonKey` من info.ts */
export function clientAnonKey(): string {
    return resolveClientSupabaseConfig().anonKey;
}

export function __resetClientEnvCacheForTests(): void {
    cached = null;
    cachedError = null;
}
