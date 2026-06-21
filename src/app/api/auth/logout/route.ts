import {
    buildClearSessionCookies,
    parseAccessCookie,
    isSecureRequest,
} from '../../security/sessionCookie.ts';
import { getVerifiedTokenSubject } from '../../security/wifeValidator.ts';
import { applyWifeSecurityHeaders } from '../../security/wifeSecurityHeaders.ts';
import { invalidateCsrfForSubject } from '../../security/csrfServerStore.ts';

/** POST /api/auth/logout — يمسح HttpOnly session cookies. */
export async function POST(request: Request): Promise<Response> {
    const token = parseAccessCookie(request.headers.get('cookie'));
    const secure = isSecureRequest(request);

    if (token) {
        const subject = await getVerifiedTokenSubject(token);
        if (subject) await invalidateCsrfForSubject(subject);
    }

    const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
    for (const cookie of buildClearSessionCookies(secure)) {
        headers.append('Set-Cookie', cookie);
    }

    return applyWifeSecurityHeaders(
        new Response(JSON.stringify({ ok: true }), { status: 200, headers }),
    );
}
