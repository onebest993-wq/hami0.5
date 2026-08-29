/** جلسة Supabase المحلية — بلا استيراد ثقيل */

export type BootSessionPeek = {
    userId: string;
    userMetadata: Record<string, unknown> | null;
};

function readBootSessionPeek(): BootSessionPeek | null {
    if (typeof localStorage === 'undefined') return null;
    try {
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (!key || !key.includes('-auth-token')) continue;
            const raw = localStorage.getItem(key);
            if (!raw || raw === 'null') continue;
            const parsed = JSON.parse(raw) as {
                user?: { id?: string; user_metadata?: Record<string, unknown> };
            };
            const id = parsed?.user?.id;
            if (typeof id === 'string' && id.trim()) {
                const meta = parsed.user?.user_metadata;
                return {
                    userId: id.trim(),
                    userMetadata: meta && typeof meta === 'object' ? meta : null,
                };
            }
        }
    } catch {
        /* ignore */
    }
    return null;
}

export function peekBootSessionUserIdSync(): string | null {
    return readBootSessionPeek()?.userId ?? null;
}

export function peekBootSessionPeekSync(): BootSessionPeek | null {
    return readBootSessionPeek();
}
