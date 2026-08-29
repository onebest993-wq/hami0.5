/**
 * روابط Magic Link لمقر القيادة ليست مسار دخول.
 * إن وصلت الجلسة أو خطأ otp_expired في العنوان نمسحها قبل أن يلتقطها supabase-js.
 */

function paramsFromSearchOrHash(raw: string): URLSearchParams {
    const trimmed = raw.startsWith('#') || raw.startsWith('?') ? raw.slice(1) : raw;
    try {
        return new URLSearchParams(trimmed);
    } catch {
        return new URLSearchParams();
    }
}

export function shouldScrubAuthReturnUrl(search = '', hash = ''): boolean {
    const bags = [paramsFromSearchOrHash(search), paramsFromSearchOrHash(hash)];
    for (const params of bags) {
        const type = (params.get('type') ?? '').toLowerCase();
        const error = (params.get('error') ?? '').toLowerCase();
        const code = (params.get('error_code') ?? '').toLowerCase();
        if (type === 'magiclink') return true;
        if (error === 'access_denied') return true;
        if (code === 'otp_expired' || code === 'otp_disabled') return true;
    }
    return false;
}

function stripBrokenAuthSearchParams(url: URL): void {
    const type = (url.searchParams.get('type') ?? '').toLowerCase();
    if (type === 'magiclink') {
        url.searchParams.delete('type');
        url.searchParams.delete('token');
    }
    url.searchParams.delete('error');
    url.searchParams.delete('error_code');
    url.searchParams.delete('error_description');
}

/** يُستدعى قبل createClient حتى لا يُفسَّر الـ hash كجلسة. */
export function scrubBrokenAuthHashFromAddress(): boolean {
    if (typeof window === 'undefined' || typeof history === 'undefined') return false;
    try {
        const url = new URL(window.location.href);
        if (!shouldScrubAuthReturnUrl(url.search, url.hash)) return false;
        url.hash = '';
        stripBrokenAuthSearchParams(url);
        const next = `${url.pathname}${url.search}` || '/';
        window.history.replaceState(window.history.state, '', next);
        return true;
    } catch {
        return false;
    }
}
