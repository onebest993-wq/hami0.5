import {
  extractUserTokenFromRequest,
  getVerifiedTokenSubject,
  isTokenAuthorized,
  verifyWifeSignature,
  wifeForbiddenResponse, wifeSignatureFailedResponse,
  wifeUnauthorizedResponse,
} from '../../security/wifeValidator.ts';
import { issueCsrfTokenForSubject, invalidateCsrfForSubject } from '../../security/csrfServerStore.ts';
import { applyWifeSecurityHeaders } from '../../security/wifeSecurityHeaders.ts';

const CSRF_COOKIE_NAME = 'hami_csrf_token';

function buildCsrfSetCookie(token: string, secure: boolean): string {
  const flags = [`${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}`, 'Path=/', 'SameSite=Strict', 'Max-Age=86400'];
  if (secure) flags.push('Secure');
  flags.push('HttpOnly');
  return flags.join('; ');
}

function buildCsrfClearCookie(secure: boolean): string {
  const flags = [`${CSRF_COOKIE_NAME}=`, 'Path=/', 'SameSite=Strict', 'Max-Age=0'];
  if (secure) flags.push('Secure');
  flags.push('HttpOnly');
  return flags.join('; ');
}

function isSecureRequest(request: Request): boolean {
  return (
    request.url.startsWith('https://') ||
    (request.headers.get('x-forwarded-proto') ?? '').toLowerCase() === 'https'
  );
}

/**
 * Bootstrap CSRF session — requires valid JWT + WIFE signature on GET.
 * Returns token in JSON and sets HttpOnly cookie (double-submit + server registry).
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const userToken = extractUserTokenFromRequest(request);
    if (!userToken || !(await isTokenAuthorized(userToken))) {
      return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
    }
    if (!(await verifyWifeSignature(request, userToken))) {
      return wifeSignatureFailedResponse(request);
    }

    const subject = await getVerifiedTokenSubject(userToken);
    if (!subject) return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });

    const csrfToken = await issueCsrfTokenForSubject(subject);
    if (!csrfToken) {
      return applyWifeSecurityHeaders(
        new Response(JSON.stringify({ ok: false, error: 'CSRF store unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }),
      );
    }

    const secure = isSecureRequest(request);

    return applyWifeSecurityHeaders(
      new Response(JSON.stringify({ ok: true, csrfToken }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Set-Cookie': buildCsrfSetCookie(csrfToken, secure),
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
    const userToken = extractUserTokenFromRequest(request);
    if (!userToken || !(await isTokenAuthorized(userToken))) {
      return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
    }
    if (!(await verifyWifeSignature(request, userToken))) {
      return wifeSignatureFailedResponse(request);
    }

    const subject = await getVerifiedTokenSubject(userToken);
    if (!subject) return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });

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
