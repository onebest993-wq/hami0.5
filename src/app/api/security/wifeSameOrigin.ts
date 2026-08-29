/** فحص نفس الأصل لمسارات إقلاع/إبطال WIFE (wife-sign / wife-session). */

import { isWifeProduction } from './wifeStoreEnv.ts';

export { isWifeProduction as isProductionNodeEnv } from './wifeStoreEnv.ts';

function isLoopbackHostname(hostname: string): boolean {
    const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function parseHttpOrigin(raw: string): URL | null {
    try {
        const url = new URL(raw);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
        return url;
    } catch {
        return null;
    }
}

function originPort(url: URL): string {
    if (url.port) return url.port;
    return url.protocol === 'https:' ? '443' : '80';
}

/** منافذ Vite/معاينة شائعة — لا تُعامل كإنتاج */
const DEV_LOOPBACK_PORTS = new Set(['8080', '5173', '4173', '8081', '3000']);

/**
 * Vite كان يبني Request على `http://127.0.0.1` بلا منفذ بينما Origin المتصفح
 * `http://127.0.0.1:8080`. في التطوير فقط نعدّ ذلك نفساً إن كان الطرفان loopback.
 */
function isViteLoopbackPortOmission(requestUrl: URL, browserOrigin: URL): boolean {
    if (isWifeProduction()) return false;
    if (requestUrl.protocol !== 'http:' || browserOrigin.protocol !== 'http:') return false;
    if (!isLoopbackHostname(requestUrl.hostname) || !isLoopbackHostname(browserOrigin.hostname)) {
        return false;
    }
    const requestIsDefaultHttp = originPort(requestUrl) === '80';
    return requestIsDefaultHttp && DEV_LOOPBACK_PORTS.has(originPort(browserOrigin));
}

export function originsAreSameSite(requestOrigin: string, browserOrigin: string): boolean {
    if (requestOrigin === browserOrigin) return true;
    const requestUrl = parseHttpOrigin(requestOrigin);
    const browserUrl = parseHttpOrigin(browserOrigin);
    if (!requestUrl || !browserUrl) return false;
    if (requestUrl.protocol !== browserUrl.protocol) return false;
    if (isViteLoopbackPortOmission(requestUrl, browserUrl)) return true;
    if (originPort(requestUrl) !== originPort(browserUrl)) return false;
    if (requestUrl.hostname === browserUrl.hostname) return true;
    if (
        !isWifeProduction() &&
        isLoopbackHostname(requestUrl.hostname) &&
        isLoopbackHostname(browserUrl.hostname)
    ) {
        return true;
    }
    return false;
}

/** IP للحدّ من الإغراق — x-forwarded-for قابل للتزييف خلف وكيل غير موثوق. */
export function readForwardedClientIp(request: Request): string {
    const xf = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const ip = xf || request.headers.get('x-real-ip')?.trim() || 'unknown';
    return ip.slice(0, 64);
}

export function assertSameOriginRequest(request: Request): boolean {
    const requestOrigin = new URL(request.url).origin;
    const origin = request.headers.get('origin')?.trim();
    if (origin) {
        return originsAreSameSite(requestOrigin, origin);
    }
    const referer = request.headers.get('referer')?.trim();
    if (referer) {
        try {
            return originsAreSameSite(requestOrigin, new URL(referer).origin);
        } catch {
            return false;
        }
    }
    return !isWifeProduction();
}
