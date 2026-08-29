import {
    buildClearSessionCookies,
    readAccessTokenFromRequest,
    isSecureRequest,
} from '../../security/sessionCookie.ts';
import { getVerifiedTokenSubject } from '../../security/wifeValidator.ts';
import { applyWifeSecurityHeaders } from '../../security/wifeSecurityHeaders.ts';
import { invalidateCsrfForSubject } from '../../security/csrfServerStore.ts';
import { invalidateWifeSessionsForSubject } from '../../security/wifeSessionServerStore.ts';
import { revokeTokenSessionsForSubject } from '../../security/stolenTokenServer.ts';
import { revokeGoTrueSession } from '../goTrueSession.ts';

/** POST /api/auth/logout — يمسح HttpOnly session cookies ويُبطل جلسة GoTrue. */
export async function POST(request: Request): Promise<Response> {
    const token = readAccessTokenFromRequest(request);
    const secure = isSecureRequest(request);

    try {
        if (token) {
            const subject = await getVerifiedTokenSubject(token);
            await revokeGoTrueSession(token, { scope: 'global' });
            if (subject) {
                await Promise.allSettled([
                    invalidateCsrfForSubject(subject),
                    invalidateWifeSessionsForSubject(subject),
                    revokeTokenSessionsForSubject(subject),
                ]);
            }
        }
    } catch {
        /* الكوكي يُمسح أدناه حتى لو تعذّر إبطال السجلات */
    }

    const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
    for (const cookie of buildClearSessionCookies(secure)) {
        headers.append('Set-Cookie', cookie);
    }

    return applyWifeSecurityHeaders(
        new Response(JSON.stringify({ ok: true }), { status: 200, headers }),
    );
}
