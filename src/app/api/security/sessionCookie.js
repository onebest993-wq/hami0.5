/**
 * HttpOnly session cookies — BFF auth (JWT لا يُخزَّن في localStorage).
 */
export var ACCESS_COOKIE_NAME = 'hami_access_token';
export var REFRESH_COOKIE_NAME = 'hami_refresh_token';
export var ACCESS_COOKIE_MAX_AGE_SEC = 60 * 60;
export var REFRESH_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7;
export function isSecureRequest(request) {
    var _a;
    return (request.url.startsWith('https://') ||
        ((_a = request.headers.get('x-forwarded-proto')) !== null && _a !== void 0 ? _a : '').toLowerCase() === 'https');
}
function parseCookieHeader(cookieHeader) {
    var out = {};
    if (!cookieHeader)
        return out;
    for (var _i = 0, _a = cookieHeader.split(';'); _i < _a.length; _i++) {
        var part = _a[_i];
        var idx = part.indexOf('=');
        if (idx <= 0)
            continue;
        var name_1 = part.slice(0, idx).trim();
        var value = part.slice(idx + 1).trim();
        if (name_1)
            out[name_1] = value;
    }
    return out;
}
export function parseAccessCookie(cookieHeader) {
    var _a;
    var raw = (_a = parseCookieHeader(cookieHeader)[ACCESS_COOKIE_NAME]) === null || _a === void 0 ? void 0 : _a.trim();
    if (!raw)
        return null;
    try {
        return decodeURIComponent(raw);
    }
    catch (_b) {
        return raw;
    }
}
export function parseRefreshCookie(cookieHeader) {
    var _a;
    var raw = (_a = parseCookieHeader(cookieHeader)[REFRESH_COOKIE_NAME]) === null || _a === void 0 ? void 0 : _a.trim();
    if (!raw)
        return null;
    try {
        return decodeURIComponent(raw);
    }
    catch (_b) {
        return raw;
    }
}
function buildSetCookie(name, value, maxAgeSec, secure) {
    var flags = [
        "".concat(name, "=").concat(encodeURIComponent(value)),
        'Path=/',
        'SameSite=Strict',
        'HttpOnly',
        "Max-Age=".concat(maxAgeSec),
    ];
    if (secure)
        flags.push('Secure');
    return flags.join('; ');
}
function buildClearCookie(name, secure) {
    var flags = ["".concat(name, "="), 'Path=/', 'SameSite=Strict', 'HttpOnly', 'Max-Age=0'];
    if (secure)
        flags.push('Secure');
    return flags.join('; ');
}
export function buildAccessSetCookie(token, secure, maxAgeSec) {
    if (maxAgeSec === void 0) { maxAgeSec = ACCESS_COOKIE_MAX_AGE_SEC; }
    return buildSetCookie(ACCESS_COOKIE_NAME, token, maxAgeSec, secure);
}
export function buildRefreshSetCookie(token, secure, maxAgeSec) {
    if (maxAgeSec === void 0) { maxAgeSec = REFRESH_COOKIE_MAX_AGE_SEC; }
    return buildSetCookie(REFRESH_COOKIE_NAME, token, maxAgeSec, secure);
}
export function buildClearSessionCookies(secure) {
    return [buildClearCookie(ACCESS_COOKIE_NAME, secure), buildClearCookie(REFRESH_COOKIE_NAME, secure)];
}
export function getSupabaseAuthConfigFromEnv() {
    var _a, _b;
    var supabaseUrl = ((_a = process.env.SUPABASE_URL) !== null && _a !== void 0 ? _a : '').trim();
    var supabaseKey = ((_b = process.env.SUPABASE_ANON_KEY) !== null && _b !== void 0 ? _b : '').trim();
    if (!supabaseUrl || !supabaseKey)
        return null;
    return { url: supabaseUrl.replace(/\/+$/, ''), key: supabaseKey };
}
