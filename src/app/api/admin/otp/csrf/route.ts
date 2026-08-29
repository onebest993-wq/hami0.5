import { requireHeadquartersCookieAuth } from '../../../security/requireHeadquartersCookieAuth.ts';
import {
    buildCsrfSetCookie,
    isSecureRequest,
} from '../../../security/csrfCookie.ts';
import { issueCsrfTokenForSubject } from '../../../security/csrfServerStore.ts';
import { applyWifeSecurityHeaders } from '../../../security/wifeSecurityHeaders.ts';

export const runtime = 'nodejs';

/**
 * CSRF لمقر القيادة من جلسة الكوكي — بلا توقيع WIFE.
 * GET /api/security/csrf يشترط WIFE وكان يرفض المدير الحقيقي، فيُخترع رمز محلي ويرفض POST.
 */
export async function GET(request: Request): Promise<Response> {
    try {
        const authGate = await requireHeadquartersCookieAuth(request);
        if (!authGate.ok) return authGate.response;

        const csrfToken = await issueCsrfTokenForSubject(authGate.userId);
        if (!csrfToken) {
            return applyWifeSecurityHeaders(
                new Response(JSON.stringify({ ok: false, error: 'Security session store unavailable' }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json; charset=utf-8' },
                }),
            );
        }

        return applyWifeSecurityHeaders(
            new Response(JSON.stringify({ ok: true, csrfToken }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Set-Cookie': buildCsrfSetCookie(csrfToken, isSecureRequest(request)),
                },
            }),
        );
    } catch {
        return applyWifeSecurityHeaders(
            new Response(JSON.stringify({ ok: false, error: 'Internal admin OTP csrf error' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }),
        );
    }
}
