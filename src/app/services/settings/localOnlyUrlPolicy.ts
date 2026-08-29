/**
 * سياسة قطع الاتصال بلا لقطة إعدادات ولا عميل سحابي —
 * تُستورد من مسار الإقلاع الحرج ومن الحارس الكامل.
 */

export const LOCAL_ONLY_PERSIST_KEY = 'hami_local_only';

/** مسارات حسّاسة تُفتح فقط داخل نافذة runBypassingLocalOnlyForUrl */
export const LOCAL_ONLY_BYPASS_PATHS = Object.freeze([
    '/api/settings/wipe',
    '/api/account/delete',
]);

/** إنهاء الجلسة — مسموح أثناء العزل (ليس تسريب ملفات) */
export const LOCAL_ONLY_SESSION_PATHS = Object.freeze(['/api/auth/logout']);

/** مسارات GoTrue على أصل المشروع فقط — تجديد/قراءة الجلسة لا ملفات القضايا */
const SUPABASE_SESSION_PATHS = new Set(['/auth/v1/logout', '/auth/v1/token', '/auth/v1/user']);

let persistMemo: boolean | undefined;

const NON_NETWORK_PROTOCOLS = new Set(['blob:', 'data:', 'about:', 'tel:', 'mailto:', 'sms:']);

export class LocalOnlyNetworkError extends Error {
    constructor(message = 'local-only-mode') {
        super(message);
        this.name = 'LocalOnlyNetworkError';
    }
}

export function persistLocalOnlyBootFlag(enabled: boolean): void {
    persistMemo = enabled;
    if (typeof localStorage === 'undefined') return;
    try {
        if (enabled) localStorage.setItem(LOCAL_ONLY_PERSIST_KEY, '1');
        else localStorage.removeItem(LOCAL_ONLY_PERSIST_KEY);
    } catch {
        /* private mode */
    }
}

export function readLocalOnlyBootFlag(): boolean {
    if (persistMemo !== undefined) return persistMemo;
    if (typeof localStorage === 'undefined') {
        persistMemo = false;
        return false;
    }
    try {
        persistMemo = localStorage.getItem(LOCAL_ONLY_PERSIST_KEY) === '1';
    } catch {
        persistMemo = false;
    }
    return persistMemo;
}

export function resetLocalOnlyPersistMemoForTests(): void {
    persistMemo = undefined;
}

/** قراءة plaintext فقط — الكتلة المشفّرة لا تُفسَّر هنا */
export function readPlaintextPersistedLocalOnlyMode(): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
        const raw = localStorage.getItem('lawyer_settings');
        if (!raw || raw.startsWith('hami_enc_v2:')) return false;
        const parsed = JSON.parse(raw) as { security?: { localOnlyMode?: unknown } };
        return parsed?.security?.localOnlyMode === true;
    } catch {
        return false;
    }
}

export function resolveAppOrigin(): string {
    if (typeof window !== 'undefined' && typeof window.location?.origin === 'string') {
        return window.location.origin;
    }
    return 'http://localhost';
}

function getConfiguredSupabaseOrigin(): string | null {
    try {
        const raw =
            typeof import.meta.env.VITE_SUPABASE_URL === 'string'
                ? import.meta.env.VITE_SUPABASE_URL.trim()
                : '';
        if (!raw || /YOUR_PROJECT|placeholder|CHANGE_ME/i.test(raw)) return null;
        return new URL(raw).origin;
    } catch {
        return null;
    }
}

export function isAllowlistedTransactionUrl(url: string, origin: string): boolean {
    try {
        const resolved = new URL(url, origin);
        if (resolved.origin !== origin) return false;
        return (LOCAL_ONLY_BYPASS_PATHS as readonly string[]).includes(resolved.pathname);
    } catch {
        return false;
    }
}

function isAlwaysAllowedSessionUrl(resolved: URL, origin: string): boolean {
    if (
        resolved.origin === origin &&
        (LOCAL_ONLY_SESSION_PATHS as readonly string[]).includes(resolved.pathname)
    ) {
        return true;
    }
    const supabaseOrigin = getConfiguredSupabaseOrigin();
    if (!supabaseOrigin || resolved.origin !== supabaseOrigin) return false;
    const path = resolved.pathname.replace(/\/+$/, '') || '/';
    return SUPABASE_SESSION_PATHS.has(path);
}

export function isUrlPermittedUnderLocalOnly(
    url: string,
    origin: string,
    bypassedHrefs: ReadonlyMap<string, number>,
): boolean {
    const trimmed = url.trim();
    if (!trimmed) return true;
    if (trimmed.startsWith('blob:') || trimmed.startsWith('data:') || trimmed.startsWith('about:')) {
        return true;
    }
    try {
        const resolved = new URL(url, origin);
        if ((bypassedHrefs.get(resolved.href) ?? 0) > 0) return true;
        if (NON_NETWORK_PROTOCOLS.has(resolved.protocol)) return true;
        if (isAlwaysAllowedSessionUrl(resolved, origin)) return true;
        if (resolved.origin !== origin) return false;
        if (resolved.pathname.startsWith('/api/')) return false;
        return true;
    } catch {
        return false;
    }
}
