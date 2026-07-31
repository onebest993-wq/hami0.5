import { applyWifeSecurityHeaders } from '../../security/wifeSecurityHeaders.ts';
import { invalidateCsrfForSubject, issueCsrfTokenForSubject } from '../../security/csrfServerStore.ts';
import {
  extractUserTokenFromRequest,
  getVerifiedTokenSubject,
  wifeUnauthorizedResponse,
} from '../../security/wifeValidator.ts';
import { requireWifeUser, unwrapWifeUser } from '../../security/bffAuth.ts';
import { extractDeviceIdFromRequest, isValidWifeDeviceId } from '../../security/stolenTokenServer.ts';
import { invalidateWifeSession, issueWifeSessionForSubject } from '../../security/wifeSessionServerStore.ts';

const CSRF_COOKIE_NAME = 'hami_csrf_token';
const CSRF_ONLY_BOOTSTRAP_MODE = 'csrf-only';

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

function isSecureRequest(request: Request): boolean {
  return (
    request.url.startsWith('https://') ||
    (request.headers.get('x-forwarded-proto') ?? '').toLowerCase() === 'https'
  );
}

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

function isCsrfOnlyBootstrapRequest(request: Request): boolean {
  const mode = request.headers.get('x-wife-bootstrap-mode')?.trim().toLowerCase() ?? '';
  return mode === CSRF_ONLY_BOOTSTRAP_MODE;
}

export async function GET(request: Request): Promise<Response> {
  if (!assertSameOriginRequest(request)) {
    return applyWifeSecurityHeaders(
      new Response(JSON.stringify({ ok: false, error: 'Forbidden origin' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }),
    );
  }

  const userToken = extractUserTokenFromRequest(request);
  const subject = userToken ? await getVerifiedTokenSubject(userToken) : null;
  if (!subject) {
    return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
  }

  const deviceId = extractDeviceIdFromRequest(request);
  if (isProductionNodeEnv() && !isValidWifeDeviceId(deviceId)) {
    return applyWifeSecurityHeaders(
      new Response(JSON.stringify({ ok: false, error: 'Device identifier required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }),
    );
  }

  const csrfToken = await issueCsrfTokenForSubject(subject);
  if (!csrfToken) {
    return applyWifeSecurityHeaders(
      new Response(JSON.stringify({ ok: false, error: 'Security session store unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }),
    );
  }

  if (isCsrfOnlyBootstrapRequest(request)) {
    return applyWifeSecurityHeaders(
      new Response(
        JSON.stringify({
          ok: true,
          csrfToken,
          bootstrapMode: CSRF_ONLY_BOOTSTRAP_MODE,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Set-Cookie': buildCsrfSetCookie(csrfToken, isSecureRequest(request)),
          },
        },
      ),
    );
  }

  const issuedSession = await issueWifeSessionForSubject(subject, deviceId);
  if (!issuedSession) {
    return applyWifeSecurityHeaders(
      new Response(JSON.stringify({ ok: false, error: 'Security session store unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }),
    );
  }

  return applyWifeSecurityHeaders(
    new Response(
      JSON.stringify({
        ok: true,
        sessionId: issuedSession.sessionId,
        sessionSecret: issuedSession.sessionSecret,
        expiresAtMs: issuedSession.expiresAtMs,
        csrfToken,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Set-Cookie': buildCsrfSetCookie(csrfToken, isSecureRequest(request)),
        },
      },
    ),
  );
}

export async function DELETE(request: Request): Promise<Response> {
  if (!assertSameOriginRequest(request)) {
    return applyWifeSecurityHeaders(
      new Response(JSON.stringify({ ok: false, error: 'Forbidden origin' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }),
    );
  }

  const authGate = unwrapWifeUser(await requireWifeUser(request));
  if ('response' in authGate) return authGate.response;
  const { userId: subject } = authGate;

  const sessionId =
    request.headers.get('x-wife-session')?.trim() ?? request.headers.get('X-WIFE-Session')?.trim() ?? '';
  if (sessionId) {
    await invalidateWifeSession(sessionId);
  }
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
}
