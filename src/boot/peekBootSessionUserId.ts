/** جلسة Supabase المحلية — بلا استيراد ثقيل */

export type BootSessionPeek = {
    userId: string;
    userMetadata: Record<string, unknown> | null;
};

const NO_RESULT_SENTINEL: unique symbol = Symbol('NO_RESULT_SENTINEL');
type CacheState = BootSessionPeek | null | typeof NO_RESULT_SENTINEL;

let cachedPeek: CacheState = NO_RESULT_SENTINEL;

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

function getCachedBootSessionPeek(): BootSessionPeek | null {
    if (cachedPeek === NO_RESULT_SENTINEL) {
        cachedPeek = readBootSessionPeek();
    }
    return cachedPeek;
}

/**
 * ينظّف ذاكرة التخزين المؤقت للوحدات — للاستخدام في الاختبارات فقط
 * (حيث يتم استدعاء beforeEach/localStorage.clear بعد كل حالة).
 * في الإنتاج تظل القيمة مخزنة لمرة واحدة عبر عمر الصفحة لأن جلسة
 * الإقلاع لا تتغير بدون full-page reload.
 */
export function resetPeekBootSessionCacheForTests(): void {
    cachedPeek = NO_RESULT_SENTINEL;
}

export function peekBootSessionUserIdSync(): string | null {
    return getCachedBootSessionPeek()?.userId ?? null;
}

export function peekBootSessionPeekSync(): BootSessionPeek | null {
    return getCachedBootSessionPeek();
}
