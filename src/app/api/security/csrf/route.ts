import { requireWifeUser, unwrapWifeUser } from '../../security/bffAuth.ts';
import {
  buildCsrfClearCookie,
  buildCsrfSetCookie,
  isSecureRequest,
} from '../../security/csrfCookie.ts';
import { issueCsrfTokenForSubject, invalidateCsrfForSubject } from '../../security/csrfServerStore.ts';
import { applyWifeSecurityHeaders } from '../../security/wifeSecurityHeaders.ts';

/**
 * Bootstrap CSRF session — requires valid JWT + WIFE signature on GET.
 * Returns token in JSON and sets HttpOnly cookie (double-submit + server registry).
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const authGate = unwrapWifeUser(await requireWifeUser(request));
    if ('response' in authGate) return authGate.response;
    const { userId: subject } = authGate;

    const csrfToken = await issueCsrfTokenForSubject(subject);
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
      new Response(JSON.stringify({ ok: false, error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }),
    );
  }
}

/** Revoke CSRF session on logout — requires JWT + WIFE on DELETE. */
export async function DELETE(request: Request): Promise<Response> {
  try {
    const authGate = unwrapWifeUser(await requireWifeUser(request));
    if ('response' in authGate) return authGate.response;
    const { userId: subject } = authGate;

    await invalidateCsrfForSubject(subject);

    return applyWifeSecurityHeaders(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Set-Cookie': buildCsrfClearCookie(isSecureRequest(request)),
        },
      }),
    );
  } catch {
    return applyWifeSecurityHeaders(
      new Response(JSON.stringify({ ok: false, error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }),
    );
  }
}
