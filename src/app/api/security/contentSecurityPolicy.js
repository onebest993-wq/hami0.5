/**
 * Single source of truth for Content-Security-Policy (WIFE / Hami).
 * Dev: relaxed for Vite HMR. Production: strict — no unsafe-eval, no inline scripts.
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
export function buildContentSecurityPolicy(mode) {
    var isDev = mode === 'development';
    var connectSrc = [
        "'self'",
        'https://*.supabase.co',
        'wss://*.supabase.co',
        'https://sentry.io',
        'https://*.ingest.sentry.io',
        'https://*.ingest.us.sentry.io',
    ];
    if (isDev) {
        connectSrc.push('http://localhost:*', 'http://127.0.0.1:*', 'ws://localhost:*', 'ws://127.0.0.1:*');
    }
    var scriptSrc = isDev
        ? ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://js.sentry-cdn.com']
        : ["'self'", 'https://js.sentry-cdn.com'];
    return __spreadArray([
        "default-src 'self'",
        "script-src ".concat(scriptSrc.join(' ')),
        "script-src-attr 'none'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: https: blob:",
        "connect-src ".concat(connectSrc.join(' ')),
        "frame-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
        "worker-src 'self' blob:"
    ], (isDev ? [] : ['upgrade-insecure-requests']), true).join('; ');
}
export function resolveCspMode(nodeEnv, viteMode) {
    var _a;
    var env = ((_a = nodeEnv !== null && nodeEnv !== void 0 ? nodeEnv : process.env.NODE_ENV) !== null && _a !== void 0 ? _a : '').toLowerCase();
    var mode = (viteMode !== null && viteMode !== void 0 ? viteMode : '').toLowerCase();
    if (env === 'development' || mode === 'development')
        return 'development';
    return 'production';
}
