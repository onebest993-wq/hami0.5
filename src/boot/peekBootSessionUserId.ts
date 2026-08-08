/** معرّف المستخدم من جلسة Supabase المحلية — بلا استيراد ثقيل */
export function peekBootSessionUserIdSync(): string | null {
    if (typeof localStorage === 'undefined') return null;
    try {
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (!key || !key.includes('-auth-token')) continue;
            const raw = localStorage.getItem(key);
            if (!raw || raw === 'null') continue;
            const parsed = JSON.parse(raw) as { user?: { id?: string } };
            const id = parsed?.user?.id;
            if (typeof id === 'string' && id.trim()) return id.trim();
        }
    } catch {
        /* ignore */
    }
    return null;
}
