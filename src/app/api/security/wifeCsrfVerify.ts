import { extractJwtSessionFields } from '@/app/security/jwtFields.ts';
import { CSRF_COOKIE_NAME, CSRF_META_NAME } from '@/app/security/csrfConstants.ts';
import { normalizeWifeMethod } from '@/app/security/wifeRequestSigningShared.ts';
import { readCsrfTokenForSubject, validateCsrfForSubject } from './csrfServerStore.ts';
import { parseCookieHeader, readIncomingCookieHeader } from './sessionCookie.ts';
import { isWifeProduction as isProductionNodeEnv } from './wifeStoreEnv.ts';
import { wifeTimingSafeEqual } from './wifeTimingSafe.ts';
import { getVerifiedTokenSubject } from './wifeTokenSubject.ts';

function getCsrfTokenHeader(req: Request): string | null {
    return req.headers.get(CSRF_META_NAME) ?? null;
}

function cookieMatchesCsrfHeader(req: Request, csrfToken: string): boolean {
    const cookieHeader = readIncomingCookieHeader(req);
    if (!cookieHeader || !cookieHeader.trim()) return false;

    const cookies = parseCookieHeader(cookieHeader);
    const csrfCookieRaw = cookies[CSRF_COOKIE_NAME];
    if (!csrfCookieRaw || !csrfCookieRaw.trim()) return false;

    let csrfCookie = csrfCookieRaw.trim();
    try {
        csrfCookie = decodeURIComponent(csrfCookie);
    } catch {
        /* use raw */
    }

    if (csrfCookie.length < 16 || csrfCookie.length > 128) return false;
    if (!/^[A-Za-z0-9\-_]+$/.test(csrfCookie)) return false;

    return wifeTimingSafeEqual(csrfToken, csrfCookie);
}

/**
 * Server-side CSRF validation (double-submit cookie pattern).
 * Mutating methods also require the subject-bound server registry in production.
 *
 * Non-production registry miss (Vite duplicate module graphs) may fall back to
 * header === HttpOnly cookie. A registry *mismatch* still rejects (subject binding).
 */
export async function verifyCsrfToken(req: Request, userToken: string): Promise<boolean> {
    const method = normalizeWifeMethod(req.method);
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(method)) return true;

    const csrfToken = getCsrfTokenHeader(req)?.trim();
    if (!csrfToken || csrfToken.length < 16 || csrfToken.length > 128) return false;
    if (!/^[A-Za-z0-9\-_]+$/.test(csrfToken)) return false;

    const verifiedSub = await getVerifiedTokenSubject(userToken);
    if (verifiedSub) {
        if (await validateCsrfForSubject(verifiedSub, csrfToken)) return true;
        if (isProductionNodeEnv()) return false;
        // Registry mismatch stays rejected; empty registry may use cookie double-submit in dev.
        if (await readCsrfTokenForSubject(verifiedSub)) return false;
        return cookieMatchesCsrfHeader(req, csrfToken);
    }

    const jwtFields = extractJwtSessionFields(userToken);
    if (jwtFields?.sub) {
        const serverValid = await validateCsrfForSubject(jwtFields.sub, csrfToken);
        if (serverValid) return true;
        if (isProductionNodeEnv()) return false;
        return true;
    }

    if (cookieMatchesCsrfHeader(req, csrfToken)) return true;

    const cookieHeader = readIncomingCookieHeader(req);
    if (!cookieHeader?.trim()) return !isProductionNodeEnv();
    const csrfCookieRaw = parseCookieHeader(cookieHeader)[CSRF_COOKIE_NAME];
    if (!csrfCookieRaw?.trim()) return !isProductionNodeEnv();
    return false;
}
