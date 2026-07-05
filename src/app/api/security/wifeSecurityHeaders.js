var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { buildContentSecurityPolicy, resolveCspMode } from './contentSecurityPolicy';
var BASE_SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-site',
    'X-XSS-Protection': '0',
};
function buildSecurityHeaders(cspMode) {
    var mode = cspMode !== null && cspMode !== void 0 ? cspMode : resolveCspMode();
    var headers = __assign(__assign({}, BASE_SECURITY_HEADERS), { 'Content-Security-Policy': buildContentSecurityPolicy(mode) });
    if (mode === 'production') {
        headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
    }
    return headers;
}
export function applyWifeSecurityHeaders(response) {
    var headers = new Headers(response.headers);
    for (var _i = 0, _a = Object.entries(buildSecurityHeaders()); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        if (!headers.has(key))
            headers.set(key, value);
    }
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers,
    });
}
export function wifeJsonResponse(status, body) {
    return applyWifeSecurityHeaders(new Response(JSON.stringify(body), {
        status: status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }));
}
export function getDevSecurityHeaders() {
    return __assign(__assign({}, buildSecurityHeaders('development')), { 'Cache-Control': 'no-store' });
}
export function getProductionSecurityHeaders() {
    return buildSecurityHeaders('production');
}
