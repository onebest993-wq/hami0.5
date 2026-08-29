/**
 * بوابة استعادة كلمة المرور — علامة جلسة + اكتشاف رابط البريد.
 * لا تخزّن أسراراً؛ فقط نية واجهة بعد `PASSWORD_RECOVERY` أو `?hami_auth=recovery`.
 */

const PENDING_KEY = 'hami:auth:password-recovery-pending';
const LISTENERS = new Set<() => void>();

function canUseSessionStorage(): boolean {
    return typeof sessionStorage !== 'undefined';
}

function emit(): void {
    LISTENERS.forEach((listener) => {
        try {
            listener();
        } catch {
            /* ignore */
        }
    });
}

export function subscribePasswordRecovery(listener: () => void): () => void {
    LISTENERS.add(listener);
    return () => LISTENERS.delete(listener);
}

export function markPasswordRecoveryPending(): void {
    if (canUseSessionStorage()) {
        try {
            sessionStorage.setItem(PENDING_KEY, '1');
        } catch {
            /* ignore */
        }
    }
    emit();
}

export function clearPasswordRecoveryPending(): void {
    if (canUseSessionStorage()) {
        try {
            sessionStorage.removeItem(PENDING_KEY);
        } catch {
            /* ignore */
        }
    }
    emit();
}

export function isPasswordRecoveryPending(): boolean {
    if (canUseSessionStorage()) {
        try {
            if (sessionStorage.getItem(PENDING_KEY) === '1') return true;
        } catch {
            /* ignore */
        }
    }
    return isPasswordRecoveryReturnUrl();
}

/** رابط العودة من رسالة الاستعادة (query أو hash من GoTrue). */
export function isPasswordRecoveryReturnUrl(
    search = typeof window !== 'undefined' ? window.location.search : '',
    hash = typeof window !== 'undefined' ? window.location.hash : '',
): boolean {
    try {
        const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
        if (params.get('hami_auth') === 'recovery') return true;
        if ((params.get('type') ?? '').toLowerCase() === 'recovery') return true;
    } catch {
        /* ignore */
    }

    const rawHash = hash.startsWith('#') ? hash.slice(1) : hash;
    if (!rawHash) return false;
    try {
        const hashParams = new URLSearchParams(rawHash);
        if ((hashParams.get('type') ?? '').toLowerCase() === 'recovery') return true;
        // بعض القوالب تضع type في query داخل hash segment
        if (rawHash.includes('type=recovery')) return true;
    } catch {
        /* ignore */
    }
    return false;
}

/** هل العنوان يبدو كعودة OAuth/PKCE أو رابط تطبيق أصلي؟ */
export function applyAuthDeepLink(rawUrl: string): boolean {
    const raw = rawUrl.trim();
    if (!raw) return false;
    let search = '';
    let hash = '';
    try {
        const normalized = raw.replace(/^iq\.hami\.legal:\/\//i, 'https://hami.legal/');
        const u = new URL(normalized);
        search = u.search;
        hash = u.hash;
    } catch {
        const q = raw.indexOf('?');
        const h = raw.indexOf('#');
        if (q >= 0) search = raw.slice(q);
        if (h >= 0) hash = raw.slice(h);
    }
    if (isPasswordRecoveryReturnUrl(search, hash) || isAuthCallbackReturnUrl(search)) {
        markPasswordRecoveryPending();
        return true;
    }
    return false;
}
export function isAuthCallbackReturnUrl(
    search = typeof window !== 'undefined' ? window.location.search : '',
): boolean {
    if (isPasswordRecoveryReturnUrl(search)) return true;
    try {
        const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
        return Boolean(params.get('code'));
    } catch {
        return false;
    }
}

/** ينظّف علامات الاستعادة من العنوان بعد التقاط الجلسة (لا يمس مسارات أخرى). */
export function scrubPasswordRecoveryUrlMarkers(): void {
    if (typeof window === 'undefined' || typeof history === 'undefined') return;
    try {
        const url = new URL(window.location.href);
        let changed = false;
        if (url.searchParams.get('hami_auth') === 'recovery') {
            url.searchParams.delete('hami_auth');
            changed = true;
        }
        if (url.hash && /type=recovery/i.test(url.hash)) {
            url.hash = '';
            changed = true;
        }
        if (changed) {
            const next = `${url.pathname}${url.search}${url.hash}`;
            window.history.replaceState(window.history.state, '', next || '/');
        }
    } catch {
        /* ignore */
    }
}
