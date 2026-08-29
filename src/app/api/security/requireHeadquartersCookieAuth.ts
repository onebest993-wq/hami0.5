import { normalizeWifeMethod } from '@/app/security/wifeRequestSigningShared.ts';
import { isAdminUserId } from './adminCheck.ts';
import { assertSameOriginRequest } from './wifeSameOrigin.ts';
import { verifyCsrfToken } from './wifeCsrfVerify.ts';
import {
    extractUserTokenFromRequest,
    getVerifiedTokenSubject,
    isTokenAuthorized,
    wifeUnauthorizedResponse,
} from './wifeValidator.ts';
import { rejectHeadquartersPublicSurface } from './headquartersOriginGate.ts';
import { wifeJsonResponse } from './wifeSecurityHeaders.ts';

const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export type HeadquartersCookieAuth =
    | { ok: true; userId: string; token: string }
    | { ok: false; response: Response };

/**
 * جلسة مقر القيادة من كوكي HttpOnly — بلا توقيع WIFE (إقلاع OTP).
 * الأصل + CSRF يمنعان طلبات عبر المواقع حتى مع كوكي الجلسة.
 */
export async function requireHeadquartersCookieAuth(request: Request): Promise<HeadquartersCookieAuth> {
    const surface = rejectHeadquartersPublicSurface(request);
    if (surface) return { ok: false, response: surface };

    if (!assertSameOriginRequest(request)) {
        return {
            ok: false,
            response: wifeJsonResponse(403, { ok: false, error: 'Forbidden origin' }),
        };
    }

    const token = extractUserTokenFromRequest(request);
    if (!token || !(await isTokenAuthorized(token))) {
        return {
            ok: false,
            response: wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' }),
        };
    }
    const method = normalizeWifeMethod(request.method);
    if (!CSRF_SAFE_METHODS.has(method) && !(await verifyCsrfToken(request, token))) {
        return {
            ok: false,
            response: wifeJsonResponse(403, { ok: false, error: 'CSRF validation failed' }),
        };
    }
    const userId = await getVerifiedTokenSubject(token);
    if (!userId) {
        return {
            ok: false,
            response: wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' }),
        };
    }
    if (!(await isAdminUserId(userId, token))) {
        return {
            ok: false,
            response: wifeJsonResponse(403, { ok: false, error: 'Unauthorized Access' }),
        };
    }
    return { ok: true, userId, token };
}
