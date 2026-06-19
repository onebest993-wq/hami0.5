import type { Session, User } from '@supabase/supabase-js';
import { projectId } from '@/utils/supabase/info';

const DEV_ACCESS_TOKEN_KEY = 'hami:dev-mock-access-token';
const DEV_ACCESS_USER_KEY = 'hami:dev-mock-user';

type StoredAuthBlob = {
    access_token?: string;
    refresh_token?: string;
    user?: User;
    expires_at?: number;
};

export function isDevMockAccessToken(token: string): boolean {
    return token.startsWith('dev-access-token-');
}

/** جلسات التطوير المحلية — لا تُرسل إلى BFF /api (تجنّب 401 في الكونسول). */
export function shouldUseServerSignedAuth(token: string | null | undefined): boolean {
    const normalized = token?.trim() ?? '';
    return Boolean(normalized) && !isDevMockAccessToken(normalized);
}

function parseStoredAuthEntry(raw: string): { user: User; session: Session } | null {
    try {
        const data = JSON.parse(raw) as Record<string, unknown>;
        const blob = (data?.currentSession ?? data) as StoredAuthBlob;
        const access_token = String(blob.access_token ?? '').trim();
        const user = blob.user;
        if (!access_token || !user?.id) return null;
        if (isDevMockAccessToken(access_token)) return null;
        return {
            user,
            session: blob as Session,
        };
    } catch {
        return null;
    }
}

/** قراءة فورية من localStorage — بدون انتظار getSession(). */
export function readPersistedSupabaseAuth(): { user: User | null; session: Session | null } {
    if (typeof localStorage === 'undefined') {
        return { user: null, session: null };
    }
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.includes('-auth-token')) continue;
            const raw = localStorage.getItem(key);
            if (!raw || raw === 'null') continue;
            const parsed = parseStoredAuthEntry(raw);
            if (parsed) return parsed;
        }
    } catch {
        /* ignore */
    }
    return { user: null, session: null };
}

export function hasPersistedSupabaseSession(): boolean {
    return readPersistedSupabaseAuth().user !== null;
}

/** توكن تطوير منفصل — لا يُخزَّن في مفتاح Supabase حتى لا يتخطى شاشة الدخول بعد إعادة التشغيل. */
export function writeDevMockAuth(session: Session): void {
    if (typeof localStorage === 'undefined') return;
    const token = session.access_token?.trim();
    if (!token || !isDevMockAccessToken(token)) return;
    localStorage.setItem(DEV_ACCESS_TOKEN_KEY, token);
    if (session.user) {
        localStorage.setItem(DEV_ACCESS_USER_KEY, JSON.stringify(session.user));
    }
}

export function readDevMockAccessToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    const token = localStorage.getItem(DEV_ACCESS_TOKEN_KEY)?.trim() ?? '';
    return token || null;
}

export function readDevMockUser(): User | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(DEV_ACCESS_USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as User;
    } catch {
        return null;
    }
}

export function clearDevMockAuth(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(DEV_ACCESS_TOKEN_KEY);
    localStorage.removeItem(DEV_ACCESS_USER_KEY);
}

/** يزيل جلسات dev القديمة المخزّنة خطأً تحت مفتاح Supabase. */
export function clearStaleDevMockFromSupabaseStorage(): void {
    if (typeof localStorage === 'undefined') return;
    const key = `sb-${projectId}-auth-token`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
        const data = JSON.parse(raw) as StoredAuthBlob;
        const token = String(data?.access_token ?? '').trim();
        if (isDevMockAccessToken(token)) {
            localStorage.removeItem(key);
        }
    } catch {
        /* ignore */
    }
}
