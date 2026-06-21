import { coalesceWifeSign } from '../../security/wifeSignInflight.ts';
import { parseAccessCookie } from '../../security/sessionCookie.ts';
import {
    createWifeSignedHeaders,
    getVerifiedTokenSubject,
    isTokenAuthorized,
    wifeRateLimitedResponse,
    wifeUnauthorizedResponse,
} from '../../security/wifeValidator.ts';
import { applyWifeSecurityHeaders } from '../../security/wifeSecurityHeaders.ts';
import { consumeRateLimitSlot } from '../../security/wifeRateLimitStore.ts';
import { resolveAllowedWifeSignTarget } from '../../security/wifeSignPolicy.ts';
import { recordWifeRejection } from '../../security/wifeSecurityMonitor.ts';

function isProductionNodeEnv(): boolean {
    return (process.env.NODE_ENV ?? '').toLowerCase() === 'production';
}

function assertSameOriginRequest(request: Request): boolean {
    const requestOrigin = new URL(request.url).origin;
    const origin = request.headers.get('origin')?.trim();
    if (origin) {
        try {
            return new URL(origin).origin === requestOrigin;
        } catch {
            return false;
        }
    }
    const referer = request.headers.get('referer')?.trim();
    if (referer) {
        try {
            return new URL(referer).origin === requestOrigin;
        } catch {
            return false;
        }
    }
    return !isProductionNodeEnv();
}

const WIFE_SIGN_RATE = { scope: 'wife-sign', maxRequests: 180, windowMs: 60_000 };

type WifeSignBody = {
    method?: unknown;
    url?: unknown;
    body?: unknown;
    contentHash?: unknown;
};

/**
 * POST /api/security/wife-sign
 * Bootstrap WIFE headers when JWT lives in HttpOnly cookie (BFF auth).
 * Hardened: same-origin + allowlisted /api/* only + dedicated rate limit.
 * Note: لا TTL cache للتوقيع — كل nonce يُستهلك مرة واحدة عند استدعاء API الهدف.
 */
export async function POST(request: Request): Promise<Response> {
    if (!assertSameOriginRequest(request)) {
        recordWifeRejection({ reason: 'signature_failed', request, detail: 'wife_sign_forbidden_origin' });
        return applyWifeSecurityHeaders(
            new Response(JSON.stringify({ ok: false, error: 'Forbidden origin' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }),
        );
    }

    const userToken = parseAccessCookie(request.headers.get('cookie'));
    if (!userToken || !(await isTokenAuthorized(userToken))) {
        return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
    }

    const subject = await getVerifiedTokenSubject(userToken);
    if (!subject) {
        return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
    }

    if (!(await consumeRateLimitSlot(subject, WIFE_SIGN_RATE))) {
        return wifeRateLimitedResponse({ request, reason: 'rate_limited', detail: 'wife_sign' });
    }

    let payload: WifeSignBody;
    try {
        payload = (await request.json()) as WifeSignBody;
    } catch {
        return applyWifeSecurityHeaders(
            new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }),
        );
    }

    const method = typeof payload.method === 'string' ? payload.method : 'GET';
    const url = typeof payload.url === 'string' ? payload.url : '';
    const body = typeof payload.body === 'string' ? payload.body : '';
    const contentHash = typeof payload.contentHash === 'string' ? payload.contentHash : undefined;

    if (!url.trim()) {
        return applyWifeSecurityHeaders(
            new Response(JSON.stringify({ ok: false, error: 'url required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }),
        );
    }

    const allowedTarget = resolveAllowedWifeSignTarget(request, url);
    if (!allowedTarget) {
        recordWifeRejection({ reason: 'signature_failed', request, detail: 'wife_sign_disallowed_target' });
        return applyWifeSecurityHeaders(
            new Response(JSON.stringify({ ok: false, error: 'Signing target not allowed', code: 'WIFE_SIGN_FORBIDDEN' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }),
        );
    }

    const requestOrigin = new URL(request.url).origin;
    const signUrl = `${requestOrigin}${allowedTarget.startsWith('/') ? allowedTarget : `/${allowedTarget}`}`;

    const headers = await coalesceWifeSign(
        { subject, method, url: signUrl, body, contentHash },
        () => createWifeSignedHeaders(method, signUrl, body, userToken, contentHash),
    );

    return applyWifeSecurityHeaders(
        new Response(JSON.stringify({ ok: true, headers }), {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }),
    );
}
