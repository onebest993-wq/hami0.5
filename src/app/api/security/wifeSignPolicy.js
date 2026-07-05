/**
 * Policy for /api/security/wife-sign — allowlist only same-origin /api/* (no bootstrap oracle abuse).
 */
var BLOCKED_WIFE_SIGN_PATHS = new Set([
    '/api/security/wife-sign',
    '/api/auth/login',
    '/api/auth/logout',
    '/api/auth/refresh',
    '/api/auth/session',
]);
/** @returns canonical pathname if allowed; null if rejected */
export function resolveAllowedWifeSignTarget(request, targetUrl) {
    var trimmed = targetUrl.trim();
    if (!trimmed)
        return null;
    var requestOrigin = new URL(request.url).origin;
    var resolved;
    try {
        resolved = new URL(trimmed, requestOrigin);
    }
    catch (_a) {
        return null;
    }
    if (resolved.origin !== requestOrigin)
        return null;
    var pathname = resolved.pathname;
    if (!pathname.startsWith('/api/'))
        return null;
    if (BLOCKED_WIFE_SIGN_PATHS.has(pathname))
        return null;
    var query = resolved.searchParams.toString();
    return query ? "".concat(pathname, "?").concat(query) : pathname;
}
export function isBlockedWifeSignPath(pathname) {
    return BLOCKED_WIFE_SIGN_PATHS.has(pathname);
}
