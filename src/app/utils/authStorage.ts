import type { Session, User } from '@supabase/supabase-js';

type StoredAuthBlob = {
    access_token?: string;
    refresh_token?: string;
    user?: User;
    expires_at?: number;
};

function parseStoredAuthEntry(raw: string): { user: User; session: Session } | null {
    try {
        const data = JSON.parse(raw) as Record<string, unknown>;
        const blob = (data?.currentSession ?? data) as StoredAuthBlob;
        const access_token = String(blob.access_token ?? '').trim();
        const user = blob.user;
        if (!access_token || !user?.id) return null;
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
